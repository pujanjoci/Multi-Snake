import { GameState, SnakePlayer, FoodItem, Position, Direction, PowerUpType, AVAILABLE_SKINS } from './types';

export const BOT_NAMES = [
  'ViperBot', 'ShadowFang', 'PixelCobra', 'Hydra99', 
  'SlitherKing', 'VenomX', 'CyberSerpent', 'NeonHunter'
];

export class GameEngine {
  public static createInitialState(config: GameState['config']): GameState {
    return {
      status: 'LOBBY',
      config,
      players: {},
      foods: [],
      timeRemaining: config.sessionDuration,
      elapsedTime: 0,
      winner: null,
      killFeed: [],
    };
  }

  // Create a new player instance
  public static createPlayer(
    id: string,
    name: string,
    skinId: string,
    isBot: boolean = false,
    isHost: boolean = false,
    gridWidth: number = 40,
    gridHeight: number = 30
  ): SnakePlayer {
    const skin = AVAILABLE_SKINS.find((s) => s.id === skinId) || AVAILABLE_SKINS[0];
    const spawnPos = this.getRandomSpawnPosition(gridWidth, gridHeight);
    const initialDir: Direction = ['UP', 'DOWN', 'LEFT', 'RIGHT'][Math.floor(Math.random() * 4)] as Direction;

    const body: Position[] = [
      spawnPos,
      this.getAdjacentPosition(spawnPos, this.getOppositeDirection(initialDir), gridWidth, gridHeight),
      this.getAdjacentPosition(
        this.getAdjacentPosition(spawnPos, this.getOppositeDirection(initialDir), gridWidth, gridHeight),
        this.getOppositeDirection(initialDir),
        gridWidth,
        gridHeight
      ),
    ];

    return {
      id,
      name: name.slice(0, 14) || 'Player',
      color: skin.primaryColor,
      skin,
      body,
      direction: initialDir,
      nextDirection: initialDir,
      score: 0,
      kills: 0,
      isAlive: true,
      isBot,
      isHost,
      isBoosting: false,
      boostFuel: 100,
      activePowerUp: null,
    };
  }

  public static getRandomSpawnPosition(width: number, height: number): Position {
    const margin = 4;
    return {
      x: margin + Math.floor(Math.random() * (width - margin * 2)),
      y: margin + Math.floor(Math.random() * (height - margin * 2)),
    };
  }

  public static getOppositeDirection(dir: Direction): Direction {
    switch (dir) {
      case 'UP': return 'DOWN';
      case 'DOWN': return 'UP';
      case 'LEFT': return 'RIGHT';
      case 'RIGHT': return 'LEFT';
    }
  }

  public static getAdjacentPosition(pos: Position, dir: Direction, width: number, height: number): Position {
    let nx = pos.x;
    let ny = pos.y;
    if (dir === 'UP') ny -= 1;
    if (dir === 'DOWN') ny += 1;
    if (dir === 'LEFT') nx -= 1;
    if (dir === 'RIGHT') nx += 1;

    // Wrap around grid boundaries
    if (nx < 0) nx = width - 1;
    if (nx >= width) nx = 0;
    if (ny < 0) ny = height - 1;
    if (ny >= height) ny = 0;

    return { x: nx, y: ny };
  }

  // Populate or replenish foods on the grid
  public static replenishFoods(state: GameState): FoodItem[] {
    const maxFoods = Math.max(8, Object.keys(state.players).length * 4);
    const currentFoods = [...state.foods];
    const { width, height } = state.config.gridSize;

    // Remove expired power-ups
    const now = Date.now();
    const activeFoods = currentFoods.filter(f => !f.expiresAt || f.expiresAt > now);

    while (activeFoods.length < maxFoods) {
      const isPowerUp = state.config.powerUpsEnabled && Math.random() < 0.25;
      const x = Math.floor(Math.random() * width);
      const y = Math.floor(Math.random() * height);

      // Check if location is free
      const occupiedByFood = activeFoods.some(f => f.x === x && f.y === y);
      if (!occupiedByFood) {
        if (isPowerUp) {
          const powerUpTypes: PowerUpType[] = ['SPEED', 'GHOST', 'MAGNET', 'GOLDEN', 'SHRINK'];
          const type = powerUpTypes[Math.floor(Math.random() * powerUpTypes.length)];
          activeFoods.push({
            id: `food_${Math.random().toString(36).substring(2, 9)}`,
            x,
            y,
            type,
            value: type === 'GOLDEN' ? 5 : 2,
            expiresAt: Date.now() + 15000, // 15s lifespan
          });
        } else {
          activeFoods.push({
            id: `food_${Math.random().toString(36).substring(2, 9)}`,
            x,
            y,
            type: 'REGULAR',
            value: 1,
          });
        }
      }
    }

    return activeFoods;
  }

  // Execute a single game physics step
  public static tick(
    prevState: GameState,
    onEatCallback?: (player: SnakePlayer, food: FoodItem) => void,
    onKillCallback?: (killer: SnakePlayer | null, victim: SnakePlayer) => void
  ): GameState {
    if (prevState.status !== 'PLAYING') return prevState;

    const { width, height } = prevState.config.gridSize;
    const players = { ...prevState.players };
    let foods = [...prevState.foods];
    const killFeed = [...prevState.killFeed];
    const deadOrbs: FoodItem[] = [];

    // 1. Process Bot Inputs
    Object.values(players).forEach(player => {
      if (player.isBot && player.isAlive) {
        player.nextDirection = this.calculateBotMove(player, prevState);
      }
    });

    // 2. Move Snakes & Power-ups
    const nextPlayerStates: Record<string, SnakePlayer> = {};

    Object.entries(players).forEach(([id, player]) => {
      if (!player.isAlive) {
        // Respawn bots after 3 seconds, players after 4 seconds
        if (player.deathTime && Date.now() - player.deathTime > (player.isBot ? 2500 : 3500)) {
          const respawned = this.createPlayer(
            player.id,
            player.name,
            player.skin.id,
            player.isBot,
            player.isHost,
            width,
            height
          );
          respawned.score = Math.floor(player.score * 0.7); // Retain 70% of score on respawn
          respawned.kills = player.kills;
          nextPlayerStates[id] = respawned;
        } else {
          nextPlayerStates[id] = player;
        }
        return;
      }

      // Check opposite direction guard
      let dir = player.nextDirection;
      if (
        (dir === 'UP' && player.direction === 'DOWN') ||
        (dir === 'DOWN' && player.direction === 'UP') ||
        (dir === 'LEFT' && player.direction === 'RIGHT') ||
        (dir === 'RIGHT' && player.direction === 'LEFT')
      ) {
        dir = player.direction;
      }

      const head = player.body[0];
      const newHead = this.getAdjacentPosition(head, dir, width, height);

      // Handle power-up timers
      let activePowerUp = player.activePowerUp;
      if (activePowerUp) {
        const remaining = activePowerUp.duration - 1;
        activePowerUp = remaining > 0 ? { ...activePowerUp, duration: remaining } : null;
      }

      // Boost mechanics
      let boostFuel = player.boostFuel;
      if (player.isBoosting && boostFuel > 5) {
        boostFuel = Math.max(0, boostFuel - 3);
      } else {
        boostFuel = Math.min(100, boostFuel + 1);
      }

      // Magnet effect: attract food towards snake head
      if (activePowerUp?.type === 'MAGNET') {
        foods = foods.map(f => {
          const dx = f.x - newHead.x;
          const dy = f.y - newHead.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist > 0 && dist < 5) {
            return {
              ...f,
              x: Math.round(f.x - Math.sign(dx) * 0.5),
              y: Math.round(f.y - Math.sign(dy) * 0.5),
            };
          }
          return f;
        });
      }

      // Clone body
      const newBody = [newHead, ...player.body];

      // Check food eating
      let ateFood = false;
      let scoreGain = 0;
      foods = foods.filter(f => {
        if (f.x === newHead.x && f.y === newHead.y) {
          ateFood = true;
          scoreGain += f.value;
          if (f.type !== 'REGULAR') {
            activePowerUp = {
              type: f.type,
              duration: 50, // ~5 seconds at 10 ticks/s
            };
          }
          if (onEatCallback) onEatCallback(player, f);
          return false;
        }
        return true;
      });

      // Tail trimming
      if (!ateFood) {
        newBody.pop();
      }

      // If shrink power up is just triggered, truncate length
      if (activePowerUp?.type === 'SHRINK' && newBody.length > 4) {
        newBody.splice(Math.max(3, Math.floor(newBody.length * 0.7)));
      }

      nextPlayerStates[id] = {
        ...player,
        body: newBody,
        direction: dir,
        nextDirection: dir,
        score: player.score + scoreGain,
        boostFuel,
        activePowerUp,
        isBoosting: player.isBoosting && boostFuel > 5,
      };
    });

    // 3. Collision Resolution
    const livingPlayers = Object.values(nextPlayerStates).filter(p => p.isAlive);

    livingPlayers.forEach(player => {
      const head = player.body[0];
      const hasGhost = player.activePowerUp?.type === 'GHOST';

      // Self collision (skip first 2 segments)
      const selfCollide = player.body.slice(1).some(seg => seg.x === head.x && seg.y === head.y);
      if (selfCollide && !hasGhost) {
        this.killSnake(player, null, killFeed, deadOrbs, onKillCallback);
        return;
      }

      // Other snakes collision
      livingPlayers.forEach(other => {
        if (other.id === player.id) return;

        // Head vs Head collision
        const otherHead = other.body[0];
        if (head.x === otherHead.x && head.y === otherHead.y) {
          if (player.body.length <= other.body.length) {
            this.killSnake(player, other, killFeed, deadOrbs, onKillCallback);
          }
          if (other.body.length <= player.body.length) {
            this.killSnake(other, player, killFeed, deadOrbs, onKillCallback);
          }
          return;
        }

        // Head vs Body collision
        if (!hasGhost) {
          const hitBody = other.body.slice(1).some(seg => seg.x === head.x && seg.y === head.y);
          if (hitBody) {
            this.killSnake(player, other, killFeed, deadOrbs, onKillCallback);
          }
        }
      });
    });

    // Add dead orbs to food
    foods = [...foods, ...deadOrbs];

    // Replenish regular food items
    foods = this.replenishFoods({
      ...prevState,
      foods,
      players: nextPlayerStates,
    });

    return {
      ...prevState,
      players: nextPlayerStates,
      foods,
      killFeed: killFeed.slice(-6), // keep last 6 kills
    };
  }

  private static killSnake(
    victim: SnakePlayer,
    killer: SnakePlayer | null,
    killFeed: GameState['killFeed'],
    deadOrbs: FoodItem[],
    onKillCallback?: (killer: SnakePlayer | null, victim: SnakePlayer) => void
  ) {
    victim.isAlive = false;
    victim.deathTime = Date.now();

    if (killer && killer.id !== victim.id) {
      killer.kills += 1;
      killer.score += 5;
    }

    // Convert victim body into food orbs
    victim.body.forEach((seg, idx) => {
      if (idx % 2 === 0) {
        deadOrbs.push({
          id: `dead_orb_${Math.random().toString(36).substring(2, 9)}`,
          x: seg.x,
          y: seg.y,
          type: 'REGULAR',
          value: 2,
          expiresAt: Date.now() + 20000,
        });
      }
    });

    killFeed.push({
      id: `kf_${Date.now()}_${Math.random()}`,
      killerName: killer ? killer.name : undefined,
      victimName: victim.name,
      killerColor: killer?.color,
      victimColor: victim.color,
      timestamp: Date.now(),
    });

    if (onKillCallback) {
      onKillCallback(killer, victim);
    }
  }

  // Smart Bot Pathfinding AI
  public static calculateBotMove(bot: SnakePlayer, state: GameState): Direction {
    const head = bot.body[0];
    const { width, height } = state.config.gridSize;
    const directions: Direction[] = ['UP', 'DOWN', 'LEFT', 'RIGHT'];

    // Filter out 180-degree instant reversal
    const validDirs = directions.filter(d => d !== this.getOppositeDirection(bot.direction));

    // Evaluate danger & rewards for each direction
    let bestDir = bot.direction;
    let bestScore = -Infinity;

    const livingSnakes = Object.values(state.players).filter(p => p.isAlive);

    // Find closest food
    let targetFood: FoodItem | null = null;
    let minDist = Infinity;
    state.foods.forEach(food => {
      const dist = Math.abs(food.x - head.x) + Math.abs(food.y - head.y);
      // prioritize power-ups or golden orbs
      const weight = food.type === 'GOLDEN' ? 0.4 : food.type !== 'REGULAR' ? 0.6 : 1.0;
      const weightedDist = dist * weight;
      if (weightedDist < minDist) {
        minDist = weightedDist;
        targetFood = food;
      }
    });

    for (const dir of validDirs) {
      const nextPos = this.getAdjacentPosition(head, dir, width, height);
      let dangerScore = 0;

      // Check collision with any snake body
      for (const snake of livingSnakes) {
        const isSelf = snake.id === bot.id;
        const bodyToCheck = isSelf ? snake.body.slice(0, -1) : snake.body;

        for (const seg of bodyToCheck) {
          if (seg.x === nextPos.x && seg.y === nextPos.y) {
            dangerScore += 10000; // lethal collision
          }
          // Soft penalty for being right next to other snake bodies
          const distToBody = Math.abs(seg.x - nextPos.x) + Math.abs(seg.y - nextPos.y);
          if (distToBody === 1 && !isSelf) {
            dangerScore += 15;
          }
        }

        // Avoid head-on collisions with longer snakes
        if (!isSelf && snake.body.length >= bot.body.length) {
          const otherHead = snake.body[0];
          const distToOtherHead = Math.abs(otherHead.x - nextPos.x) + Math.abs(otherHead.y - nextPos.y);
          if (distToOtherHead <= 1) {
            dangerScore += 500;
          }
        }
      }

      // Lookahead 2 steps for trap detection
      const lookaheadPos = this.getAdjacentPosition(nextPos, dir, width, height);
      for (const snake of livingSnakes) {
        for (const seg of snake.body) {
          if (seg.x === lookaheadPos.x && seg.y === lookaheadPos.y) {
            dangerScore += 50;
          }
        }
      }

      // Reward moving towards target food
      let foodReward = 0;
      const currentTarget = targetFood as FoodItem | null;
      if (currentTarget) {
        const currentDist = Math.abs(currentTarget.x - head.x) + Math.abs(currentTarget.y - head.y);
        const newDist = Math.abs(currentTarget.x - nextPos.x) + Math.abs(currentTarget.y - nextPos.y);
        if (newDist < currentDist) {
          foodReward = 20;
        }
      }

      // Small bonus for keeping current direction to avoid erratic zig-zagging
      const momentumBonus = dir === bot.direction ? 5 : 0;

      const totalScore = foodReward + momentumBonus - dangerScore;
      if (totalScore > bestScore) {
        bestScore = totalScore;
        bestDir = dir;
      }
    }

    return bestDir;
  }
}
