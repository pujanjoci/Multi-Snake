'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GameState, RoomConfig, Direction, ChatMessage, SessionNotification, AVAILABLE_SKINS, SnakePlayer } from '../lib/types';
import { GameEngine, BOT_NAMES } from '../lib/gameEngine';
import { NetworkManager, NetworkEvent } from '../lib/network';
import { soundManager } from '../lib/audio';
import { LobbyView } from '../components/LobbyView';
import { GameCanvas } from '../components/GameCanvas';
import { HUD } from '../components/HUD';
import { NotificationOverlay } from '../components/NotificationOverlay';
import { GameOverModal } from '../components/GameOverModal';
import { MobileControls } from '../components/MobileControls';

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [myPlayerId, setMyPlayerId] = useState<string>('');
  const [playerName, setPlayerName] = useState<string>('Player');
  const [selectedSkinId, setSelectedSkinId] = useState<string>('emerald');
  const [isHost, setIsHost] = useState<boolean>(true);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [notification, setNotification] = useState<SessionNotification | null>(null);

  const [roomConfig, setRoomConfig] = useState<RoomConfig>({
    roomCode: 'SNAK',
    hostId: '',
    maxPlayers: 8,
    gridSize: { width: 44, height: 32 },
    sessionDuration: 300, // 5 minutes standard
    powerUpsEnabled: true,
    fillWithBots: true,
    botCount: 4,
    speed: 'normal',
  });

  const [gameState, setGameState] = useState<GameState>(() =>
    GameEngine.createInitialState(roomConfig)
  );

  const networkRef = useRef<NetworkManager | null>(null);
  const gameStateRef = useRef<GameState>(gameState);
  gameStateRef.current = gameState;

  const isHostRef = useRef<boolean>(isHost);
  isHostRef.current = isHost;

  const gameLoopRef = useRef<NodeJS.Timeout | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const warnedTimesRef = useRef<Set<number>>(new Set());

  // Initialize player ID and room code on mount
  useEffect(() => {
    setMounted(true);
    const pid = `p_${Math.random().toString(36).substring(2, 9)}`;
    setMyPlayerId(pid);

    const savedName = localStorage.getItem('snake_player_name');
    if (savedName) setPlayerName(savedName);

    const savedSkin = localStorage.getItem('snake_player_skin');
    if (savedSkin) setSelectedSkinId(savedSkin);

    // Check URL search params for room code
    const urlParams = new URLSearchParams(window.location.search);
    const queryRoom = urlParams.get('room');

    const network = new NetworkManager(pid);
    networkRef.current = network;

    if (queryRoom) {
      const code = queryRoom.toUpperCase();
      setIsHost(false);
      setRoomConfig((prev) => ({ ...prev, roomCode: code, hostId: '' }));
      network.joinRoom(code, savedName || 'Player', savedSkin || 'emerald');
    } else {
      const randomCode = Math.random().toString(36).substring(2, 6).toUpperCase();
      setIsHost(true);
      setRoomConfig((prev) => ({ ...prev, roomCode: randomCode, hostId: pid }));
      network.initHost(randomCode);

      // Create host player in initial state
      const hostPlayer = GameEngine.createPlayer(
        pid,
        savedName || 'Player',
        savedSkin || 'emerald',
        false,
        true,
        44,
        32
      );
      setGameState((prev) => ({
        ...prev,
        players: { [pid]: hostPlayer },
      }));
    }

    // Subscribe to network events
    const unsubscribe = network.onEvent((event: NetworkEvent) => {
      handleNetworkEvent(event, pid);
    });

    return () => {
      unsubscribe();
      network.cleanup();
      if (gameLoopRef.current) clearInterval(gameLoopRef.current);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, []);

  // Handle incoming network events
  const handleNetworkEvent = useCallback((event: NetworkEvent, myId: string) => {
    switch (event.type) {
      case 'JOIN_LOBBY': {
        if (isHostRef.current) {
          const newPlayer = GameEngine.createPlayer(
            event.player.id,
            event.player.name,
            event.player.skinId,
            false,
            false,
            gameStateRef.current.config.gridSize.width,
            gameStateRef.current.config.gridSize.height
          );
          setGameState((prev) => {
            const nextPlayers = { ...prev.players, [event.player.id]: newPlayer };
            // Broadcast updated lobby
            networkRef.current?.broadcast({
              type: 'LOBBY_STATE',
              players: Object.values(nextPlayers),
              config: prev.config,
            });
            return { ...prev, players: nextPlayers };
          });
        }
        break;
      }

      case 'LOBBY_STATE': {
        setRoomConfig(event.config);
        const playerMap: Record<string, SnakePlayer> = {};
        event.players.forEach((p) => {
          playerMap[p.id] = p;
        });
        setGameState((prev) => ({
          ...prev,
          config: event.config,
          players: playerMap,
        }));
        break;
      }

      case 'UPDATE_SKIN': {
        if (isHostRef.current) {
          setGameState((prev) => {
            const player = prev.players[event.playerId];
            if (!player) return prev;
            const skin = AVAILABLE_SKINS.find((s) => s.id === event.skinId) || AVAILABLE_SKINS[0];
            const updated = { ...player, skin, color: skin.primaryColor };
            const nextPlayers = { ...prev.players, [event.playerId]: updated };
            networkRef.current?.broadcast({
              type: 'LOBBY_STATE',
              players: Object.values(nextPlayers),
              config: prev.config,
            });
            return { ...prev, players: nextPlayers };
          });
        }
        break;
      }

      case 'UPDATE_CONFIG': {
        setRoomConfig((prev) => ({ ...prev, ...event.config }));
        setGameState((prev) => ({
          ...prev,
          config: { ...prev.config, ...event.config },
          timeRemaining: event.config.sessionDuration || prev.timeRemaining,
        }));
        break;
      }

      case 'START_GAME': {
        setGameState((prev) => ({ ...prev, status: 'PLAYING' }));
        break;
      }

      case 'GAME_STATE': {
        if (!isHostRef.current) {
          setGameState(event.state);
        }
        break;
      }

      case 'PLAYER_INPUT': {
        if (isHostRef.current) {
          setGameState((prev) => {
            const player = prev.players[event.playerId];
            if (!player) return prev;
            return {
              ...prev,
              players: {
                ...prev.players,
                [event.playerId]: {
                  ...player,
                  nextDirection: event.direction,
                  isBoosting: event.isBoosting,
                },
              },
            };
          });
        }
        break;
      }

      case 'PLAYER_EMOTE': {
        setGameState((prev) => {
          const player = prev.players[event.playerId];
          if (!player) return prev;
          return {
            ...prev,
            players: {
              ...prev.players,
              [event.playerId]: {
                ...player,
                emote: {
                  symbol: event.symbol,
                  expiresAt: Date.now() + 3000,
                },
              },
            },
          };
        });
        break;
      }

      case 'CHAT_MESSAGE': {
        setChatMessages((prev) => [...prev.slice(-40), event.message]);
        break;
      }

      case 'SESSION_ALERT': {
        setNotification({
          id: `alert_${Date.now()}`,
          type: event.alertType,
          title: event.title,
          message: event.message,
          timestamp: Date.now(),
          durationMs: 4500,
        });
        if (event.alertType === 'critical') {
          soundManager.playUrgentAlert();
        } else {
          soundManager.playSessionWarning();
        }
        break;
      }
    }
  }, []);

  // Update profile handlers
  const handleUpdateName = (name: string) => {
    setPlayerName(name);
    localStorage.setItem('snake_player_name', name);
    if (gameState.players[myPlayerId]) {
      setGameState((prev) => ({
        ...prev,
        players: {
          ...prev.players,
          [myPlayerId]: {
            ...prev.players[myPlayerId],
            name,
          },
        },
      }));
    }
  };

  const handleUpdateSkin = (skinId: string) => {
    setSelectedSkinId(skinId);
    localStorage.setItem('snake_player_skin', skinId);
    if (isHost) {
      const skin = AVAILABLE_SKINS.find((s) => s.id === skinId) || AVAILABLE_SKINS[0];
      setGameState((prev) => {
        const player = prev.players[myPlayerId];
        if (!player) return prev;
        const updated = { ...player, skin, color: skin.primaryColor };
        return {
          ...prev,
          players: { ...prev.players, [myPlayerId]: updated },
        };
      });
    } else {
      networkRef.current?.sendToHost({
        type: 'UPDATE_SKIN',
        playerId: myPlayerId,
        skinId,
      });
    }
  };

  const handleJoinRoomCode = async (targetCode: string) => {
    setIsHost(false);
    setRoomConfig((prev) => ({ ...prev, roomCode: targetCode, hostId: '' }));
    
    // Update browser URL without reload
    const newUrl = `${window.location.pathname}?room=${targetCode}`;
    window.history.pushState({ path: newUrl }, '', newUrl);

    if (networkRef.current) {
      await networkRef.current.joinRoom(targetCode, playerName, selectedSkinId);
    }
  };

  const handleUpdateConfig = (partial: Partial<RoomConfig>) => {
    const updated = { ...roomConfig, ...partial };
    setRoomConfig(updated);
    setGameState((prev) => ({
      ...prev,
      config: updated,
      timeRemaining: updated.sessionDuration,
    }));
    networkRef.current?.broadcast({
      type: 'UPDATE_CONFIG',
      config: partial,
    });
  };

  // Start game session
  const handleStartGame = () => {
    if (!isHost) return;

    warnedTimesRef.current.clear();
    const { width, height } = roomConfig.gridSize;

    // Build player roster (human players + optional bots)
    const players: Record<string, SnakePlayer> = {};

    // Keep human players
    Object.values(gameState.players).forEach((p) => {
      if (!p.isBot) {
        players[p.id] = GameEngine.createPlayer(
          p.id,
          p.name,
          p.skin.id,
          false,
          p.isHost,
          width,
          height
        );
      }
    });

    // Add smart AI bots if enabled
    if (roomConfig.fillWithBots && roomConfig.botCount > 0) {
      for (let i = 0; i < roomConfig.botCount; i++) {
        const botId = `bot_${i}_${Math.random().toString(36).substring(2, 6)}`;
        const botName = BOT_NAMES[i % BOT_NAMES.length];
        const botSkin = AVAILABLE_SKINS[(i + 2) % AVAILABLE_SKINS.length];
        players[botId] = GameEngine.createPlayer(
          botId,
          botName,
          botSkin.id,
          true,
          false,
          width,
          height
        );
      }
    }

    const startingState: GameState = {
      status: 'PLAYING',
      config: roomConfig,
      players,
      foods: [],
      timeRemaining: roomConfig.sessionDuration,
      elapsedTime: 0,
      winner: null,
      killFeed: [],
    };

    // Initial food spawn
    startingState.foods = GameEngine.replenishFoods(startingState);

    setGameState(startingState);
    networkRef.current?.broadcast({ type: 'START_GAME' });
    networkRef.current?.broadcast({ type: 'GAME_STATE', state: startingState });
  };

  // Chat message send
  const handleSendMessage = (text: string) => {
    const mySkin = AVAILABLE_SKINS.find((s) => s.id === selectedSkinId) || AVAILABLE_SKINS[0];
    const message: ChatMessage = {
      id: `msg_${Date.now()}_${Math.random()}`,
      senderId: myPlayerId,
      senderName: playerName,
      senderColor: mySkin.primaryColor,
      text,
      timestamp: Date.now(),
    };
    setChatMessages((prev) => [...prev.slice(-40), message]);
    networkRef.current?.broadcast({ type: 'CHAT_MESSAGE', message });
  };

  // Send Emote Reaction
  const handleSendEmote = (symbol: string) => {
    setGameState((prev) => {
      const player = prev.players[myPlayerId];
      if (!player) return prev;
      return {
        ...prev,
        players: {
          ...prev.players,
          [myPlayerId]: {
            ...player,
            emote: { symbol, expiresAt: Date.now() + 3000 },
          },
        },
      };
    });

    networkRef.current?.broadcast({
      type: 'PLAYER_EMOTE',
      playerId: myPlayerId,
      symbol,
    });
  };

  // Local direction change
  const handleDirectionChange = (newDir: Direction) => {
    const player = gameState.players[myPlayerId];
    if (!player || !player.isAlive) return;

    if (
      (newDir === 'UP' && player.direction === 'DOWN') ||
      (newDir === 'DOWN' && player.direction === 'UP') ||
      (newDir === 'LEFT' && player.direction === 'RIGHT') ||
      (newDir === 'RIGHT' && player.direction === 'LEFT')
    ) {
      return;
    }

    setGameState((prev) => {
      const current = prev.players[myPlayerId];
      if (!current) return prev;
      return {
        ...prev,
        players: {
          ...prev.players,
          [myPlayerId]: { ...current, nextDirection: newDir },
        },
      };
    });

    if (isHost) {
      // Local apply
    } else {
      networkRef.current?.sendToHost({
        type: 'PLAYER_INPUT',
        playerId: myPlayerId,
        direction: newDir,
        isBoosting: player.isBoosting,
      });
    }
  };

  // Local boost toggle
  const handleBoost = (boosting: boolean) => {
    const player = gameState.players[myPlayerId];
    if (!player) return;

    if (boosting && player.boostFuel > 10) {
      soundManager.playBoost();
    }

    setGameState((prev) => {
      const current = prev.players[myPlayerId];
      if (!current) return prev;
      return {
        ...prev,
        players: {
          ...prev.players,
          [myPlayerId]: { ...current, isBoosting: boosting },
        },
      };
    });

    if (!isHost) {
      networkRef.current?.sendToHost({
        type: 'PLAYER_INPUT',
        playerId: myPlayerId,
        direction: player.direction,
        isBoosting: boosting,
      });
    }
  };

  // Keyboard controls listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        e.preventDefault();
        handleDirectionChange('UP');
      } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        e.preventDefault();
        handleDirectionChange('DOWN');
      } else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        e.preventDefault();
        handleDirectionChange('LEFT');
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        e.preventDefault();
        handleDirectionChange('RIGHT');
      } else if (e.key === ' ' || e.key === 'Shift') {
        e.preventDefault();
        handleBoost(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Shift') {
        handleBoost(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameState.players, myPlayerId]);

  // HOST authoritative simulation & session timer loop
  useEffect(() => {
    if (!isHost || gameState.status !== 'PLAYING') {
      if (gameLoopRef.current) clearInterval(gameLoopRef.current);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      return;
    }

    // Snake speed scaled to 0.65x of original pace for better tactical control
    const tickRateMs =
      roomConfig.speed === 'fast'
        ? Math.round(75 / 0.65) // 115ms
        : roomConfig.speed === 'slow'
        ? Math.round(120 / 0.65) // 185ms
        : Math.round(95 / 0.65); // 146ms (Normal)

    // Physics Loop
    gameLoopRef.current = setInterval(() => {
      setGameState((prevState) => {
        const next = GameEngine.tick(
          prevState,
          (player, food) => {
            if (player.id === myPlayerId) {
              if (food.type === 'REGULAR') soundManager.playEat();
              else soundManager.playPowerUp();
            }
          },
          (killer, victim) => {
            if (victim.id === myPlayerId) soundManager.playDeath();
            if (killer?.id === myPlayerId) soundManager.playKill();
          }
        );

        // Broadcast snapshot to peers
        networkRef.current?.broadcast({
          type: 'GAME_STATE',
          state: next,
        });

        return next;
      });
    }, tickRateMs);

    // 1-Second Session Timer & Session Ending Notification Engine
    timerIntervalRef.current = setInterval(() => {
      setGameState((prev) => {
        const newTime = Math.max(0, prev.timeRemaining - 1);
        const newElapsed = prev.elapsedTime + 1;

        // Trigger session-closing notifications at critical timestamps
        if (newTime === 120 && !warnedTimesRef.current.has(120)) {
          warnedTimesRef.current.add(120);
          const alert = {
            type: 'SESSION_ALERT' as const,
            title: '⚠️ 2 Minutes Remaining',
            message: 'Session is drawing near its end! Maximize your score now.',
            alertType: 'warning' as const,
          };
          networkRef.current?.broadcast(alert);
          handleNetworkEvent(alert, myPlayerId);
        } else if (newTime === 60 && !warnedTimesRef.current.has(60)) {
          warnedTimesRef.current.add(60);
          const alert = {
            type: 'SESSION_ALERT' as const,
            title: '⚔️ 1 Minute Left - Final Rush!',
            message: 'High value golden orbs & power-ups are surging across the arena!',
            alertType: 'rush' as const,
          };
          networkRef.current?.broadcast(alert);
          handleNetworkEvent(alert, myPlayerId);
        } else if (newTime === 30 && !warnedTimesRef.current.has(30)) {
          warnedTimesRef.current.add(30);
          const alert = {
            type: 'SESSION_ALERT' as const,
            title: '🚨 30 Seconds - Final Countdown',
            message: 'Last chance to eliminate rivals and claim the top podium!',
            alertType: 'critical' as const,
          };
          networkRef.current?.broadcast(alert);
          handleNetworkEvent(alert, myPlayerId);
        } else if (newTime <= 10 && newTime > 0) {
          soundManager.playCountdownTick(newTime <= 3);
        }

        // Check Match End
        if (newTime <= 0) {
          if (gameLoopRef.current) clearInterval(gameLoopRef.current);
          if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);

          const sorted = Object.values(prev.players).sort((a, b) => b.score - a.score);
          const winner = sorted[0] || null;

          const endedState: GameState = {
            ...prev,
            status: 'ENDED',
            timeRemaining: 0,
            winner,
          };

          networkRef.current?.broadcast({
            type: 'GAME_STATE',
            state: endedState,
          });

          return endedState;
        }

        return {
          ...prev,
          timeRemaining: newTime,
          elapsedTime: newElapsed,
        };
      });
    }, 1000);

    return () => {
      if (gameLoopRef.current) clearInterval(gameLoopRef.current);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [isHost, gameState.status, roomConfig.speed, myPlayerId, handleNetworkEvent]);

  if (!mounted) return null;

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-slate-950 font-sans">
      {/* Session Warning & Notification Banner */}
      <NotificationOverlay
        notification={notification}
        timeRemaining={gameState.timeRemaining}
        onDismiss={() => setNotification(null)}
      />

      {/* Lobby State */}
      {gameState.status === 'LOBBY' && (
        <LobbyView
          roomConfig={roomConfig}
          players={Object.values(gameState.players)}
          myPlayerId={myPlayerId}
          isHost={isHost}
          playerName={playerName}
          selectedSkinId={selectedSkinId}
          chatMessages={chatMessages}
          onUpdateName={handleUpdateName}
          onUpdateSkin={handleUpdateSkin}
          onUpdateConfig={handleUpdateConfig}
          onStartGame={handleStartGame}
          onSendMessage={handleSendMessage}
          onJoinRoomCode={handleJoinRoomCode}
        />
      )}

      {/* In-Game Playing State */}
      {gameState.status === 'PLAYING' && (
        <>
          <HUD
            gameState={gameState}
            myPlayerId={myPlayerId}
            onSendEmote={handleSendEmote}
            isMuted={isMuted}
            onToggleMute={() => setIsMuted(soundManager.toggleMute())}
          />
          <GameCanvas gameState={gameState} myPlayerId={myPlayerId} />
          <MobileControls
            onDirectionChange={handleDirectionChange}
            onBoostStart={() => handleBoost(true)}
            onBoostEnd={() => handleBoost(false)}
            onSendEmote={handleSendEmote}
            boostFuel={gameState.players[myPlayerId]?.boostFuel ?? 100}
          />
        </>
      )}

      {/* Game Ended Podium & Summary Modal */}
      {gameState.status === 'ENDED' && (
        <GameOverModal
          gameState={gameState}
          myPlayerId={myPlayerId}
          isHost={isHost}
          onRestart={handleStartGame}
          onReturnToLobby={() => {
            setGameState((prev) => ({
              ...prev,
              status: 'LOBBY',
              timeRemaining: prev.config.sessionDuration,
            }));
            networkRef.current?.broadcast({
              type: 'LOBBY_STATE',
              players: Object.values(gameState.players),
              config: roomConfig,
            });
          }}
        />
      )}
    </main>
  );
}
