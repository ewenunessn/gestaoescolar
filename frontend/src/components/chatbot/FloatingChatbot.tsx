import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Drawer,
  Fab,
  IconButton,
  InputBase,
  Paper,
  Tooltip,
  Typography,
  alpha,
  useTheme,
} from '@mui/material';
import { Bot, Clock3, LoaderCircle, Send, X } from 'lucide-react';

import {
  enviarMensagemChatbot,
  type ChatbotHistoryMessage,
} from '../../services/chatbotService';

type LocalMessage = ChatbotHistoryMessage & {
  id: string;
};

const iconProps = { size: 18, strokeWidth: 1.8 };

function getLoadingProcess(elapsedSeconds: number): string {
  if (elapsedSeconds >= 90) return 'Gerando resposta final';
  if (elapsedSeconds >= 45) return 'Consultando dados do sistema';
  return 'Interpretando com a LLM';
}

function createMessage(role: LocalMessage['role'], content: string): LocalMessage {
  return {
    id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    role,
    content,
  };
}

export const FloatingChatbot: React.FC = () => {
  return null;
};
