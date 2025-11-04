import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

interface Message {
  id: string;
  sender: string;
  content: string;
  timestamp: string;
  isRead: boolean;
}

interface Conversation {
  id: string;
  customerId: string;
  customerName: string;
  customerAvatar: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  isStarred: boolean;
  messages: Message[];
  selected?: boolean;
}

@Component({
  selector: 'app-chat',
  imports: [CommonModule, FormsModule],
  templateUrl: './chat.html',
  styleUrl: './chat.css',
  standalone: true
})
export class ChatComponent implements OnInit {
  private http = inject(HttpClient);

  conversations: Conversation[] = [];
  allConversations: Conversation[] = [];
  filteredConversations: Conversation[] = [];
  
  currentConversation: Conversation | null = null;
  currentFilter: 'all' | 'unread' | 'starred' = 'all';
  
  searchQuery = '';
  newMessageContent = '';
  
  isLoading = false;

  ngOnInit(): void {
    this.loadConversations();
  }

  /**
   * Load conversations (sample data for now)
   */
  loadConversations(): void {
    this.isLoading = true;
    
    // Sample data - can be replaced with API call later
    setTimeout(() => {
      this.allConversations = [
        {
          id: 'conv001',
          customerId: 'KH0001',
          customerName: 'Nguyễn Văn A',
          customerAvatar: 'asset/icons/avatar.png',
          lastMessage: 'Cho tôi hỏi sản phẩm rau hữu cơ có còn hàng không ạ?',
          lastMessageTime: 'x phút trước',
          unreadCount: 2,
          isStarred: false,
          messages: [
            {
              id: 'm1',
              sender: 'customer',
              content: 'Xin chào! Tôi muốn tư vấn về rau hữu cơ',
              timestamp: 'Thứ 1, 20 Oct 2025',
              isRead: true
            },
            {
              id: 'm2',
              sender: 'admin',
              content: 'Chào bạn! VGreen rất vui được tư vấn cho bạn. Bạn quan tâm đến loại rau nào ạ?',
              timestamp: 'Thứ 1, 20 Oct 2025',
              isRead: true
            },
            {
              id: 'm3',
              sender: 'customer',
              content: 'Cho tôi hỏi sản phẩm rau hữu cơ có còn hàng không ạ?',
              timestamp: 'Thứ 1 tháng 1 2025',
              isRead: false
            }
          ]
        },
        {
          id: 'conv002',
          customerId: 'KH0002',
          customerName: 'Trần Thị B',
          customerAvatar: 'asset/icons/avatar.png',
          lastMessage: 'Tôi muốn tư vấn về gói combo rau xanh cho gia đình...',
          lastMessageTime: 'x phút trước',
          unreadCount: 1,
          isStarred: true,
          messages: [
            {
              id: 'm4',
              sender: 'customer',
              content: 'Tôi muốn tư vấn về gói combo rau xanh cho gia đình',
              timestamp: 'Thứ 1 tháng 1 2025',
              isRead: false
            }
          ]
        },
        {
          id: 'conv003',
          customerId: 'KH0003',
          customerName: 'Lê Văn C',
          customerAvatar: 'asset/icons/avatar.png',
          lastMessage: 'Vùng quận 7 có giao hàng không shop?',
          lastMessageTime: 'x phút trước',
          unreadCount: 0,
          isStarred: false,
          messages: [
            {
              id: 'm5',
              sender: 'customer',
              content: 'Vùng quận 7 có giao hàng không shop?',
              timestamp: 'Thứ 1 tháng 1 2025',
              isRead: true
            },
            {
              id: 'm6',
              sender: 'admin',
              content: 'Dạ có ạ! VGreen giao hàng toàn khu vực quận 7',
              timestamp: 'Thứ 1 tháng 1 2025',
              isRead: true
            }
          ]
        },
        {
          id: 'conv004',
          customerId: 'KH0004',
          customerName: 'Phạm Thị D',
          customerAvatar: 'asset/icons/avatar.png',
          lastMessage: 'Cảm ơn shop đã tư vấn nhiệt tình!',
          lastMessageTime: 'x phút trước',
          unreadCount: 0,
          isStarred: false,
          messages: [
            {
              id: 'm7',
              sender: 'customer',
              content: 'Cảm ơn shop đã tư vấn nhiệt tình!',
              timestamp: 'Thứ 1 tháng 1 2025',
              isRead: true
            }
          ]
        },
        {
          id: 'conv005',
          customerId: 'KH0005',
          customerName: 'Hoàng Văn E',
          customerAvatar: 'asset/icons/avatar.png',
          lastMessage: 'Sản phẩm có giảm giá không ạ?',
          lastMessageTime: 'x phút trước',
          unreadCount: 3,
          isStarred: true,
          messages: [
            {
              id: 'm8',
              sender: 'customer',
              content: 'Sản phẩm có giảm giá không ạ?',
              timestamp: 'Thứ 1 tháng 1 2025',
              isRead: false
            }
          ]
        }
      ];
      
      this.conversations = [...this.allConversations];
      this.filteredConversations = [...this.conversations];
      this.isLoading = false;
      
      // Auto-select first unread conversation
      const firstUnread = this.conversations.find(c => c.unreadCount > 0);
      if (firstUnread) {
        this.selectConversation(firstUnread);
      }
    }, 500);
  }

  /**
   * Select a conversation to view
   */
  selectConversation(conversation: Conversation): void {
    this.currentConversation = conversation;
    
    // Mark messages as read
    conversation.messages.forEach(m => m.isRead = true);
    conversation.unreadCount = 0;
  }

  /**
   * Filter conversations
   */
  filterConversations(filter: 'all' | 'unread' | 'starred'): void {
    this.currentFilter = filter;
    
    if (filter === 'all') {
      this.filteredConversations = [...this.conversations];
    } else if (filter === 'unread') {
      this.filteredConversations = this.conversations.filter(c => c.unreadCount > 0);
    } else if (filter === 'starred') {
      this.filteredConversations = this.conversations.filter(c => c.isStarred);
    }
  }

  /**
   * Search conversations
   */
  searchConversations(event: Event): void {
    const query = (event.target as HTMLInputElement).value;
    
    if (!query || query.trim() === '') {
      this.filterConversations(this.currentFilter);
    } else {
      const searchTerm = query.toLowerCase().trim();
      this.filteredConversations = this.conversations.filter(conv => {
        return (
          conv.customerName.toLowerCase().includes(searchTerm) ||
          conv.lastMessage.toLowerCase().includes(searchTerm) ||
          conv.customerId.toLowerCase().includes(searchTerm)
        );
      });
    }
  }

  /**
   * Toggle star for conversation
   */
  toggleStar(conversation: Conversation, event: Event): void {
    event.stopPropagation();
    conversation.isStarred = !conversation.isStarred;
  }

  /**
   * Send a new message
   */
  sendMessage(): void {
    if (!this.currentConversation || !this.newMessageContent.trim()) {
      return;
    }

    const newMessage: Message = {
      id: `m${Date.now()}`,
      sender: 'admin',
      content: this.newMessageContent.trim(),
      timestamp: 'Vừa xong',
      isRead: true
    };

    this.currentConversation.messages.push(newMessage);
    this.currentConversation.lastMessage = newMessage.content;
    this.currentConversation.lastMessageTime = 'Vừa xong';
    
    this.newMessageContent = '';
    
    // Scroll to bottom after sending
    setTimeout(() => {
      this.scrollToBottom();
    }, 100);
  }

  /**
   * Scroll chat to bottom
   */
  private scrollToBottom(): void {
    const chatBody = document.querySelector('.chat-messages-body');
    if (chatBody) {
      chatBody.scrollTop = chatBody.scrollHeight;
    }
  }

  /**
   * Get message class based on sender
   */
  getMessageClass(message: Message): string {
    return message.sender === 'admin' ? 'message-sent' : 'message-received';
  }

  /**
   * Get total unread count
   */
  getTotalUnreadCount(): number {
    return this.conversations.reduce((sum, conv) => sum + conv.unreadCount, 0);
  }

  /**
   * Handle enter key in message input
   */
  onMessageKeyPress(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }
}








