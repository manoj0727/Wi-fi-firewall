import { useEffect } from 'react';
import io from 'socket.io-client';
import useStore from '../store/useStore';

const SOCKET_URL = 'http://localhost:3001';

let socket = null;

export const useSocketConnection = () => {
  const {
    setStats,
    setRules,
    setBlockedDomains,
    addQueryToHistory,
    setConnectionStatus
  } = useStore();

  useEffect(() => {
    socket = io(SOCKET_URL);

    socket.on('connect', () => {
      console.log('Connected to server');
      setConnectionStatus(true);
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from server');
      setConnectionStatus(false);
    });

    socket.on('initial-data', (data) => {
      setStats(data.stats);
      setRules(data.rules);
      setBlockedDomains(data.blockedDomains);
    });

    socket.on('stats-update', (stats) => {
      setStats(stats);
    });

    socket.on('dns-query', (query) => {
      addQueryToHistory(query);
    });

    socket.on('rules-update', (rules) => {
      setRules(rules);
    });

    socket.on('blocked-domains-update', (domains) => {
      setBlockedDomains(domains);
    });

    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [setStats, setRules, setBlockedDomains, addQueryToHistory, setConnectionStatus]);

  return socket;
};

export const getSocket = () => socket;