import {
  Component,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  AfterViewChecked,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface ChatMessage {
  text: string;
  time: string;
  isBot: boolean;
}

@Component({
  selector: 'app-veebot',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './veebot.html',
  styleUrl: './veebot.css',
})
export class Veebot implements OnInit, OnDestroy, AfterViewChecked {
  isChatOpen: boolean = false;
  hasNewMessage: boolean = false;
  inputMessage: string = '';
  messages: ChatMessage[] = [];

  @ViewChild('chatMessages') chatMessages!: ElementRef;
  @ViewChild('messageInput') messageInput!: ElementRef;

  private shouldScrollToBottom: boolean = false;
  private welcomeMessages: string[] = [
    'Xin chào! Tôi là Veebot, trợ lý ảo của VGreen. Tôi có thể giúp gì cho bạn?',
    'Bạn có thể hỏi tôi về sản phẩm, đơn hàng, hoặc bất kỳ thắc mắc nào về VGreen!',
    'Gõ "sản phẩm" để xem danh sách sản phẩm, "đơn hàng" để kiểm tra đơn hàng, hoặc "hỗ trợ" để được hỗ trợ!',
  ];

  ngOnInit(): void {
    // Thêm tin nhắn chào mừng khi component khởi tạo
    this.addWelcomeMessages();
  }

  ngAfterViewChecked(): void {
    // Tự động scroll xuống cuối khi có tin nhắn mới
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }
  }

  ngOnDestroy(): void {
    // Dọn dẹp nếu cần
  }

  toggleChat(): void {
    this.isChatOpen = !this.isChatOpen;

    if (this.isChatOpen) {
      // Đánh dấu không còn tin nhắn mới khi mở chat
      this.hasNewMessage = false;

      // Tập trung vào ô nhập sau khi mở
      setTimeout(() => {
        if (this.messageInput) {
          this.messageInput.nativeElement.focus();
        }
      }, 300);
    }
  }

  closeChat(): void {
    this.isChatOpen = false;
  }

  sendMessage(): void {
    if (!this.inputMessage || !this.inputMessage.trim()) {
      return;
    }

    // Lưu tin nhắn trước khi clear
    const messageText = this.inputMessage.trim();

    // Thêm tin nhắn của người dùng
    const userMessage: ChatMessage = {
      text: messageText,
      time: this.getCurrentTime(),
      isBot: false,
    };

    this.messages.push(userMessage);

    // Clear input ngay lập tức
    this.inputMessage = '';

    // Đảm bảo input được clear trong DOM
    if (this.messageInput) {
      this.messageInput.nativeElement.value = '';
      // Focus lại input để có thể tiếp tục nhập
      setTimeout(() => {
        if (this.messageInput) {
          this.messageInput.nativeElement.focus();
        }
      }, 0);
    }

    this.shouldScrollToBottom = true;

    // Mô phỏng phản hồi từ bot sau 1 giây
    setTimeout(() => {
      this.handleBotResponse(messageText);
    }, 1000);
  }

  private handleBotResponse(userMessage: string): void {
    const lowerMessage = userMessage.toLowerCase();
    let botResponse: string = '';

    // Xử lý các câu hỏi phổ biến
    if (lowerMessage.includes('sản phẩm') || lowerMessage.includes('product')) {
      botResponse =
        'VGreen có nhiều sản phẩm chất lượng cao như rau củ hữu cơ, trái cây, thực phẩm khô, trà và cà phê. Bạn có thể xem danh sách sản phẩm tại trang chủ hoặc tìm kiếm sản phẩm cụ thể!';
    } else if (lowerMessage.includes('đơn hàng') || lowerMessage.includes('order')) {
      botResponse =
        'Để kiểm tra đơn hàng, vui lòng đăng nhập vào tài khoản của bạn và truy cập phần "Quản lý đơn hàng". Nếu bạn chưa có tài khoản, hãy đăng ký để theo dõi đơn hàng dễ dàng hơn!';
    } else if (
      lowerMessage.includes('hỗ trợ') ||
      lowerMessage.includes('support') ||
      lowerMessage.includes('help')
    ) {
      botResponse =
        'Bạn có thể liên hệ với chúng tôi qua:\n- Hotline: 0125 456 789\n- Email: vgreen@gmail.com\n- Hoặc truy cập trang "Hỗ trợ" để được giải đáp các câu hỏi thường gặp!';
    } else if (
      lowerMessage.includes('giá') ||
      lowerMessage.includes('price') ||
      lowerMessage.includes('cost')
    ) {
      botResponse =
        'Giá sản phẩm được hiển thị trên từng trang sản phẩm. VGreen cam kết mang đến giá cả hợp lý và chất lượng tốt nhất cho khách hàng!';
    } else if (
      lowerMessage.includes('giao hàng') ||
      lowerMessage.includes('delivery') ||
      lowerMessage.includes('ship')
    ) {
      botResponse =
        'VGreen giao hàng toàn quốc. Thời gian giao hàng thường từ 1-3 ngày tùy khu vực. Bạn có thể xem chi tiết chính sách giao hàng tại trang "Chính sách"!';
    } else if (
      lowerMessage.includes('đổi trả') ||
      lowerMessage.includes('return') ||
      lowerMessage.includes('refund')
    ) {
      botResponse =
        'VGreen có chính sách đổi trả trong vòng 7 ngày nếu sản phẩm không đúng chất lượng. Chi tiết xem tại trang "Chính sách đổi trả"!';
    } else if (lowerMessage.includes('cảm ơn') || lowerMessage.includes('thank')) {
      botResponse =
        'Không có gì! Rất vui được hỗ trợ bạn. Nếu có thêm câu hỏi nào, đừng ngại hỏi tôi nhé!';
    } else if (
      lowerMessage.includes('xin chào') ||
      lowerMessage.includes('hello') ||
      lowerMessage.includes('hi')
    ) {
      botResponse = 'Xin chào! Tôi có thể giúp gì cho bạn hôm nay?';
    } else {
      botResponse =
        'Cảm ơn bạn đã liên hệ! Tôi hiểu bạn đang hỏi về: "' +
        userMessage +
        '".\n\nĐể được hỗ trợ tốt hơn, bạn có thể:\n- Gọi hotline: 0125 456 789\n- Email: vgreenhotro@gmail.com\n- Hoặc truy cập trang "Hỗ trợ" để xem các câu hỏi thường gặp!';
    }

    const botMessage: ChatMessage = {
      text: botResponse,
      time: this.getCurrentTime(),
      isBot: true,
    };

    this.messages.push(botMessage);
    this.shouldScrollToBottom = true;

    // Đánh dấu có tin nhắn mới nếu chat đang đóng
    if (!this.isChatOpen) {
      this.hasNewMessage = true;
    }
  }

  private addWelcomeMessages(): void {
    // Thêm tin nhắn chào mừng ban đầu
    const welcomeMessage: ChatMessage = {
      text: this.welcomeMessages[0],
      time: this.getCurrentTime(),
      isBot: true,
    };
    this.messages.push(welcomeMessage);
  }

  private scrollToBottom(): void {
    if (this.chatMessages) {
      const element = this.chatMessages.nativeElement;
      element.scrollTop = element.scrollHeight;
    }
  }

  private getCurrentTime(): string {
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  formatMessage(text: string): string {
    // Thay \n thành <br> để hiển thị xuống dòng đúng chỗ
    return text.replace(/\n/g, '<br>');
  }
}
