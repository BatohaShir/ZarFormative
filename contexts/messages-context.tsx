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

// Mock conversations data
// Миний үйлчилгээнүүд (incoming = клиенты пишут мне)
// Би бусдын үйлчилгээнд сонирхсон (outgoing = я пишу провайдеру)
const initialConversations: Conversation[] = [
  // Клиент сонирхож байна - миний "Гэрийн цэвэрлэгээ" үйлчилгээнд
  {
    id: 1,
    type: "incoming",
    person: {
      name: "Батбаяр Д.",
      avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop",
    },
    service: {
      title: "Гэрийн цэвэрлэгээ",
      image: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=400&h=400&fit=crop",
    },
    lastMessage: "маргааш 10:00 100 квадрат байрыг цэвэрлэх",
    lastMessageTime: new Date(Date.now() - 1000 * 60 * 14),
    unreadCount: 1,
    isOnline: true,
    requestExpiresAt: Date.now() + 1000 * 60 * 60 + 1000 * 60 * 44, // 1:44 remaining
  },
  // Клиент сонирхож байна - миний "Орон сууцны засвар" үйлчилгээнд
  {
    id: 2,
    type: "incoming",
    person: {
      name: "Оюунаа Б.",
      avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop",
    },
    service: {
      title: "Орон сууцны засвар",
      image: "https://images.unsplash.com/photo-1562259949-e8e7689d7828?w=400&h=400&fit=crop",
    },
    lastMessage: "2 өрөө байрны хана будах, шал солих ажил хийлгэмээр байна",
    lastMessageTime: new Date(Date.now() - 1000 * 60 * 60 * 2),
    unreadCount: 0,
    isOnline: true,
  },
  // Би өөр хүний үйлчилгээнд сонирхсон
  {
    id: 3,
    type: "outgoing",
    person: {
      name: "ТехМастер",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop",
    },
    service: {
      title: "Компьютер засвар",
      image: "https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?w=400&h=400&fit=crop",
    },
    lastMessage: "Таны компьютер засвар дууссан байна. Ирж авч болно.",
    lastMessageTime: new Date(Date.now() - 1000 * 60 * 60 * 24),
    unreadCount: 0,
    isOnline: false,
  },
  // Клиент сонирхож байна - миний "Англи хэлний хичээл" үйлчилгээнд
  {
    id: 4,
    type: "incoming",
    person: {
      name: "Ганбат Э.",
      avatar: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=100&h=100&fit=crop",
    },
    service: {
      title: "Англи хэлний хичээл",
      image: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=400&h=400&fit=crop",
    },
    lastMessage: "IELTS-д бэлдэх хичээл авмаар байна",
    lastMessageTime: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3),
    unreadCount: 0,
    isOnline: false,
  },
  // Би өөр хүний үйлчилгээнд сонирхсон
  {
    id: 5,
    type: "outgoing",
    person: {
      name: "Хурд Логистик",
      avatar: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=100&h=100&fit=crop",
    },
    service: {
      title: "Ачаа тээвэр",
      image: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=400&h=400&fit=crop",
    },
    lastMessage: "Таны ачааг амжилттай хүргэлээ. Баярлалаа!",
    lastMessageTime: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7),
    unreadCount: 0,
    isOnline: true,
  },
];

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

export function useMessages() {
  const context = React.useContext(MessagesContext);
  if (context === undefined) {
    throw new Error("useMessages must be used within a MessagesProvider");
  }
  return context;
}
