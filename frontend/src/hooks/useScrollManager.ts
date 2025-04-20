import { useRef, useState, useEffect, useCallback } from 'react';

/**
 * Hook เพื่อจัดการการเลื่อนในหน้าต่างแชท
 * จัดการฟังก์ชันการทำงานต่างๆเช่น การเลื่อนอัตโนมัติ การตรวจสอบเมื่อผู้ใช้เลื่อนด้วยตนเอง
 */
export function useScrollManager() {
  // Refs สำหรับ DOM elements
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  
  // State เกี่ยวกับการ scroll
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const [isNearBottom, setIsNearBottom] = useState(true);
  const [lastScrollPosition, setLastScrollPosition] = useState(0);
  const [userScrolledManually, setUserScrolledManually] = useState(false);
  const [messageCount, setMessageCount] = useState(0);

  /**
   * ฟังก์ชันการเลื่อนไปด้านล่างสุด
   */
  const scrollToBottom = useCallback((force?: boolean) => {
    if ((shouldAutoScroll || force) && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [shouldAutoScroll]);

  /**
   * การจัดการคลิกปุ่มเลื่อนลงด้านล่าง
   */
  const handleScrollToBottom = useCallback(() => {
    setShouldAutoScroll(true);
    setIsNearBottom(true);
    setUserScrolledManually(false);
    
    // ใช้ requestAnimationFrame เพื่อการแอนิเมชันที่ราบรื่น
    requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    });
  }, []);

  /**
   * ตรวจสอบและอัปเดตตำแหน่งการเลื่อน
   */
  const updateScrollPosition = useCallback(() => {
    const chatContainer = chatContainerRef.current;
    if (!chatContainer) return;
    
    const { scrollTop, scrollHeight, clientHeight } = chatContainer;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    const dynamicThreshold = Math.max(10, clientHeight * 0.03);
    const isAtBottom = distanceFromBottom < dynamicThreshold;
    
    setIsNearBottom(isAtBottom);
  }, []);

  /**
   * ติดตั้ง scroll listener
   */
  useEffect(() => {
    const chatContainer = chatContainerRef.current;
    if (!chatContainer) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = chatContainer;
      
      // คำนวณระยะห่างจากด้านล่าง (ในหน่วยพิกเซล)
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
      
      // พิจารณาว่าอยู่ "ใกล้ด้านล่าง" หากอยู่ภายในขอบเขตที่กำหนด (3% ของความสูงหรืออย่างน้อย 10px)
      const dynamicThreshold = Math.max(10, clientHeight * 0.03);
      const isAtBottom = distanceFromBottom < dynamicThreshold;
      
      // ตรวจจับว่าผู้ใช้กำลังเลื่อนด้วยตนเองโดยเปรียบเทียบกับตำแหน่งล่าสุด
      const isManualScrollAction = Math.abs(scrollTop - lastScrollPosition) > 5;
      setLastScrollPosition(scrollTop);
      
      // อัปเดตสถานะ UI สำหรับปุ่มเลื่อนไปด้านล่าง
      setIsNearBottom(isAtBottom);
      
      // การเลื่อนด้วยตนเองและไม่ได้อยู่ที่ด้านล่างควรปิดการเลื่อนอัตโนมัติ
      if (isManualScrollAction && !isAtBottom) {
        setUserScrolledManually(true);
        if (shouldAutoScroll) {
          setShouldAutoScroll(false);
        }
      }
      
      // เปิดใช้งานการเลื่อนอัตโนมัติอีกครั้งเมื่อผู้ใช้เลื่อนไปที่ด้านล่างโดยตรง
      if (isAtBottom && userScrolledManually) {
        setUserScrolledManually(false);
        if (!shouldAutoScroll) {
          setShouldAutoScroll(true);
        }
      }
    };

    // ใช้ requestAnimationFrame เพื่อการตรวจจับที่ราบรื่นขึ้นระหว่างการเลื่อน
    let ticking = false;
    const scrollListener = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          handleScroll();
          ticking = false;
        });
        ticking = true;
      }
    };

    chatContainer.addEventListener('scroll', scrollListener, { passive: true });
    
    // ทำความสะอาด event listener
    return () => {
      chatContainer.removeEventListener('scroll', scrollListener);
    };
  }, [shouldAutoScroll, lastScrollPosition, userScrolledManually]);

  /**
   * เลื่อนไปด้านล่างอัตโนมัติเมื่อมีข้อความใหม่
   */
  useEffect(() => {
    // เลื่อนอัตโนมัติเฉพาะเมื่อ:
    // 1. การเลื่อนอัตโนมัติถูกเปิดใช้งาน
    // 2. ผู้ใช้ไม่ได้เลื่อนด้วยตนเอง
    if (shouldAutoScroll && !userScrolledManually) {
      scrollToBottom();
    }
  }, [messageCount, shouldAutoScroll, userScrolledManually, scrollToBottom]);
  
  /**
   * ตรวจจับเหตุการณ์จาก WebSocket เมื่อรับข้อความใหม่
   */
  useEffect(() => {
    const handleChatMessageReceived = (event: Event) => {
      const customEvent = event as CustomEvent;
      const { messageType } = customEvent.detail || {};
      
      // เลื่อนอัตโนมัติเมื่อมีข้อความใหม่ เว้นแต่ผู้ใช้เลื่อนขึ้นเอง
      if (!userScrolledManually && shouldAutoScroll) {
        scrollToBottom();
      }
      
      // เมื่อข้อความเสร็จสมบูรณ์ แต่ผู้ใช้ไม่ได้เลื่อนตัวเอง
      // ให้อัพเดทในกรณีที่เป็นการตอบกลับเสร็จสมบูรณ์
      if (messageType === 'complete' && !userScrolledManually) {
        setShouldAutoScroll(true);
        scrollToBottom(true);
      }
    };
    
    // ติดตั้ง event listener สำหรับเหตุการณ์ที่เกิดจาก WebSocket
    window.addEventListener('chatMessageReceived', handleChatMessageReceived as EventListener);
    
    // ทำความสะอาด event listener
    return () => {
      window.removeEventListener('chatMessageReceived', handleChatMessageReceived as EventListener);
    };
  }, [scrollToBottom, shouldAutoScroll, userScrolledManually]);

  /**
   * ตรวจจับเหตุการณ์เมื่อข้อความถูกอัพเดต
   */
  useEffect(() => {
    const handleContentUpdated = (event: Event) => {
      const customEvent = event as CustomEvent;
      const { type, forceScroll } = customEvent.detail || {};
      
      // update หมายถึงการอัพเดตข้อความระหว่าง streaming
      if (type === 'update') {
        // เลื่อนอัตโนมัติ ถ้าไม่ได้เลื่อนด้วยตนเอง
        if (!userScrolledManually && shouldAutoScroll) {
          setTimeout(() => scrollToBottom(), 10);
        }
      } 
      // complete หมายถึงข้อความเสร็จสมบูรณ์แล้ว
      else if (type === 'complete') {
        // เปิดใช้งานการเลื่อนอัตโนมัติอีกครั้ง ถ้าจำเป็น
        if (!userScrolledManually || forceScroll) {
          setShouldAutoScroll(true);
          scrollToBottom(true);
        }
      }
    };
    
    // ติดตั้ง event listener สำหรับการอัพเดตเนื้อหา
    window.addEventListener('chatContentUpdated', handleContentUpdated as EventListener);
    
    return () => {
      window.removeEventListener('chatContentUpdated', handleContentUpdated as EventListener);
    };
  }, [scrollToBottom, shouldAutoScroll, userScrolledManually]);
  
  /**
   * ตรวจจับเหตุการณ์เมื่อต้องการทำงานกับการเลื่อน
   */
  useEffect(() => {
    const handleScrollAction = (event: Event) => {
      const customEvent = event as CustomEvent;
      const { action, forceScroll } = customEvent.detail || {};
      
      if (action === 'enableAutoScroll') {
        setShouldAutoScroll(true);
        setUserScrolledManually(false);
        
        if (forceScroll) {
          scrollToBottom(true);
        }
      } else if (action === 'scrollToBottom') {
        handleScrollToBottom();
      }
    };
    
    // ติดตั้ง event listener สำหรับการจัดการเหตุการณ์การเลื่อน
    window.addEventListener('chatScrollAction', handleScrollAction as EventListener);
    
    return () => {
      window.removeEventListener('chatScrollAction', handleScrollAction as EventListener);
    };
  }, [scrollToBottom, handleScrollToBottom]);

  // คืนค่า state และ methods ที่จำเป็น
  return {
    // Refs
    messagesEndRef,
    chatContainerRef,
    
    // State
    shouldAutoScroll,
    isNearBottom,
    userScrolledManually,
    messageCount,
    
    // Actions
    setShouldAutoScroll,
    setIsNearBottom,
    setUserScrolledManually,
    setMessageCount,
    scrollToBottom,
    handleScrollToBottom,
    updateScrollPosition
  };
}

export default useScrollManager; 