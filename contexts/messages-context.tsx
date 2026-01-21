"use client";

import * as React from "react";

interface Conversation {
  id: number;
  type: "incoming" | "outgoing"; // incoming = клиент пишет мне, outgoing = я пишу провайдеру
  person: {
    name: string;
    avatar: string;
  };
  service: {
    title: string;
    image: string;
  };
  lastMessage: string;
  lastMessageTime: Date;
  unreadCount: number;
  isOnline: boolean;
  requestExpiresAt?: number; // timestamp when request expires (pending status)
}

interface MessagesContextType {
  conversations: Conversation[];
  archivedConversations: Conversation[];
  acceptedConversations: Set<number>;
  totalUnreadCount: number;
  markAsRead: (conversationId: number) => void;
  archiveConversation: (conversationId: number) => void;
  unarchiveConversation: (conversationId: number) => void;
  deleteConversation: (conversationId: number) => void;
  acceptRequest: (conversationId: number) => void;
  declineRequest: (conversationId: number) => void;
  isAccepted: (conversationId: number) => boolean;
}

const MessagesContext = React.createContext<MessagesContextType | undefined>(undefined);

// Пустой массив - mock данные удалены для уменьшения размера бандла (~3-4KB gzipped)
// TODO: Заменить на реальную интеграцию с БД когда будет готов чат
const initialConversations: Conversation[] = [];

export function MessagesProvider({ children }: { children: React.ReactNode }) {
  const [conversations, setConversations] = React.useState<Conversation[]>(initialConversations);
  const [archivedConversations, setArchivedConversations] = React.useState<Conversation[]>([]);
  const [acceptedConversations, setAcceptedConversations] = React.useState<Set<number>>(new Set());

  const totalUnreadCount = React.useMemo(() => {
    return conversations.reduce((sum, conv) => sum + conv.unreadCount, 0);
  }, [conversations]);

  const markAsRead = React.useCallback((conversationId: number) => {
    setConversations((prev) =>
      prev.map((c) =>
        c.id === conversationId ? { ...c, unreadCount: 0 } : c
      )
    );
  }, []);

  const archiveConversation = React.useCallback((conversationId: number) => {
    setConversations((prev) => {
      const conversation = prev.find((c) => c.id === conversationId);
      if (conversation) {
        setArchivedConversations((archived) => [...archived, conversation]);
      }
      return prev.filter((c) => c.id !== conversationId);
    });
  }, []);

  const unarchiveConversation = React.useCallback((conversationId: number) => {
    setArchivedConversations((prev) => {
      const conversation = prev.find((c) => c.id === conversationId);
      if (conversation) {
        setConversations((convs) => [...convs, conversation]);
      }
      return prev.filter((c) => c.id !== conversationId);
    });
  }, []);

  const deleteConversation = React.useCallback((conversationId: number) => {
    setConversations((prev) => prev.filter((c) => c.id !== conversationId));
    setArchivedConversations((prev) => prev.filter((c) => c.id !== conversationId));
  }, []);

  const acceptRequest = React.useCallback((conversationId: number) => {
    // Mark conversation as accepted (remove timer, enable chat)
    setAcceptedConversations((prev) => new Set(prev).add(conversationId));
    // Clear the expiration timer
    setConversations((prev) =>
      prev.map((c) =>
        c.id === conversationId ? { ...c, requestExpiresAt: undefined } : c
      )
    );
  }, []);

  const declineRequest = React.useCallback((conversationId: number) => {
    // Move conversation to archive
    archiveConversation(conversationId);
  }, [archiveConversation]);

  const isAccepted = React.useCallback((conversationId: number) => {
    return acceptedConversations.has(conversationId);
  }, [acceptedConversations]);

  // Мемоизируем context value чтобы предотвратить ненужные ре-рендеры потребителей
  const contextValue = React.useMemo<MessagesContextType>(
    () => ({
      conversations,
      archivedConversations,
      acceptedConversations,
      totalUnreadCount,
      markAsRead,
      archiveConversation,
      unarchiveConversation,
      deleteConversation,
      acceptRequest,
      declineRequest,
      isAccepted,
    }),
    [
      conversations,
      archivedConversations,
      acceptedConversations,
      totalUnreadCount,
      markAsRead,
      archiveConversation,
      unarchiveConversation,
      deleteConversation,
      acceptRequest,
      declineRequest,
      isAccepted,
    ]
  );

  return (
    <MessagesContext.Provider value={contextValue}>
      {children}
    </MessagesContext.Provider>
  );
}

// Дефолтные значения для гостей (когда MessagesProvider не загружен)
const defaultGuestContext: MessagesContextType = {
  conversations: [],
  archivedConversations: [],
  acceptedConversations: new Set(),
  totalUnreadCount: 0,
  markAsRead: () => {},
  archiveConversation: () => {},
  unarchiveConversation: () => {},
  deleteConversation: () => {},
  acceptRequest: () => {},
  declineRequest: () => {},
  isAccepted: () => false,
};

/**
 * Хук для сообщений - безопасен для гостей
 * Возвращает пустые данные если MessagesProvider не загружен
 */
export function useMessages() {
  const context = React.useContext(MessagesContext);
  // Для гостей возвращаем дефолтный контекст вместо ошибки
  if (context === undefined) {
    return defaultGuestContext;
  }
  return context;
}
