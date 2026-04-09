import { useState, useCallback } from 'react';
import { api } from '../utils/api';

export function useCopilot() {
  const [conversations, setConversations] = useState([]);
  const [messages, setMessages]           = useState([]);
  const [activeConvId, setActiveConvId]   = useState(null);
  const [loading, setLoading]             = useState(false);
  const [sending, setSending]             = useState(false);

  const fetchConversations = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/copilot/conversations');
      if (res.success) setConversations(res.data);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadConversation = useCallback(async (id) => {
    setActiveConvId(id);
    setMessages([]);
    const res = await api.get(`/copilot/conversations/${id}/messages`);
    if (res.success) setMessages(res.data);
  }, []);

  const sendMessage = useCallback(async (message, fy) => {
    setSending(true);
    // Optimistically add user message
    const tempUser = { id: Date.now(), role: 'user', content: message, created_at: new Date().toISOString() };
    setMessages(prev => [...prev, tempUser]);
    try {
      const res = await api.post('/copilot/chat', {
        message,
        conversation_id: activeConvId,
        fy,
      });
      if (!res.success) throw new Error(res.message);
      const { conversation_id, reply, zoho_synced, zoho_sync_at } = res.data;

      if (!activeConvId) {
        setActiveConvId(conversation_id);
        await fetchConversations();
      } else {
        // Update conversation updated_at in list
        setConversations(prev => prev.map(c =>
          c.id === conversation_id ? { ...c, updated_at: new Date().toISOString() } : c
        ));
      }

      const assistantMsg = {
        id:         Date.now() + 1,
        role:       'assistant',
        content:    reply,
        zoho_synced,
        zoho_sync_at,
        created_at: new Date().toISOString(),
      };
      setMessages(prev => [...prev, assistantMsg]);
      return { conversation_id };
    } finally {
      setSending(false);
    }
  }, [activeConvId, fetchConversations]);

  const newChat = useCallback(() => {
    setActiveConvId(null);
    setMessages([]);
  }, []);

  const deleteConversation = useCallback(async (id) => {
    await api.delete(`/copilot/conversations/${id}`);
    setConversations(prev => prev.filter(c => c.id !== id));
    if (activeConvId === id) {
      setActiveConvId(null);
      setMessages([]);
    }
  }, [activeConvId]);

  return {
    conversations, messages, activeConvId, loading, sending,
    fetchConversations, loadConversation, sendMessage, newChat, deleteConversation,
  };
}

export default useCopilot;
