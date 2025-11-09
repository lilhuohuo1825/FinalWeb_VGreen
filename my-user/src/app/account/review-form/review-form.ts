import {
  Component,
  OnChanges,
  SimpleChanges,
  Input,
  Output,
  EventEmitter,
  ViewChild,
  ElementRef,
  OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface ReviewProduct {
  id: string;
  productName: string;
  productImage?: string;
  category: string;
  sku?: string; // SKU của sản phẩm để gửi lên API
  rating?: number | null;
  reviewText?: string | null;
  images?: (string | null)[];
}

@Component({
  selector: 'app-review-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './review-form.html',
  styleUrls: ['./review-form.css'],
})
export class ReviewFormComponent implements OnChanges, OnDestroy {
  @Input() showModal: boolean = false;
  @Input() products: ReviewProduct[] = [];
  @Output() close = new EventEmitter<void>();
  @Output() submit = new EventEmitter<ReviewProduct[]>();

  @ViewChild('videoElement') videoElement!: ElementRef<HTMLVideoElement>;
  @ViewChild('canvasElement') canvasElement!: ElementRef<HTMLCanvasElement>;

  internalProducts: ReviewProduct[] = [];
  showCameraModal: boolean = false;
  currentProduct: ReviewProduct | null = null;
  currentImageIndex: number = -1;
  capturedImage: string | null = null;
  mediaStream: MediaStream | null = null;

  ngOnChanges(changes: SimpleChanges): void {
 // Copy products array whenever it changes
    if (this.products && this.products.length > 0) {
      this.internalProducts = this.products.map((p) => ({
        ...p,
        rating: p.rating || 5, // Default to 5 stars if no rating exists
        reviewText: p.reviewText || '',
        images: p.images || [null, null, null, null, null], // Initialize with 5 empty slots
      }));
    } else {
      this.internalProducts = [];
    }
  }

  closeModal(event: any): void {
    this.close.emit();
  }

  setRating(product: ReviewProduct, rating: number): void {
    product.rating = rating;
  }

  getRatingText(rating: number | null | undefined): string {
    if (!rating) return '';
    const ratings: { [key: number]: string } = {
      1: 'Rất không hài lòng',
      2: 'Không hài lòng',
      3: 'Bình thường',
      4: 'Hài lòng',
      5: 'Rất hài lòng',
    };
    return ratings[rating] || '';
  }

  canSubmit(): boolean {
    return this.internalProducts.every(
      (p) => p.rating !== undefined && p.rating !== null && p.rating > 0
    );
  }

  openCameraView(product: ReviewProduct, index: number): void {
    this.currentProduct = product;
    this.currentImageIndex = index;
    this.showCameraModal = true;
    this.capturedImage = null;

 // Start camera after modal opens and view is ready
    setTimeout(() => {
      this.startCamera();
    }, 300);
  }

  closeCameraModal(): void {
    this.stopCamera();
    this.showCameraModal = false;
    this.currentProduct = null;
    this.currentImageIndex = -1;
    this.capturedImage = null;
  }

  async startCamera(): Promise<void> {
    try {
 // Check if video element exists, if not wait a bit more
      if (!this.videoElement?.nativeElement) {
        setTimeout(() => this.startCamera(), 100);
        return;
      }

      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      const video = this.videoElement.nativeElement;
      if (video && this.mediaStream) {
        video.srcObject = this.mediaStream;
        video.muted = true; // Ensure muted for autoplay
        video.setAttribute('playsinline', 'true');
        video.setAttribute('webkit-playsinline', 'true');

 // Wait for video to be ready
        video.onloadedmetadata = () => {
          video.play().catch((err) => {
 console.error('Error playing video:', err);
          });
        };

 // Also try immediate play
        video.play().catch((err) => {
 console.error('Error playing video immediately:', err);
        });
      }
    } catch (error) {
 console.error('Error accessing camera:', error);
 // Fallback to file upload if camera access fails
    }
  }

  stopCamera(): void {
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }
    if (this.videoElement?.nativeElement) {
      this.videoElement.nativeElement.srcObject = null;
    }
  }

  capturePhoto(): void {
    if (this.videoElement?.nativeElement && this.canvasElement?.nativeElement) {
      const video = this.videoElement.nativeElement;
      const canvas = this.canvasElement.nativeElement;
      const context = canvas.getContext('2d');

      if (video.videoWidth && video.videoHeight && context) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0);
        this.capturedImage = canvas.toDataURL('image/jpeg');
        this.stopCamera();
      }
    }
  }

  retakePhoto(): void {
    this.capturedImage = null;
    this.startCamera();
  }

  usePhoto(): void {
    if (this.currentProduct && this.capturedImage !== null) {
      if (!this.currentProduct.images) {
        this.currentProduct.images = [null, null, null, null, null];
      }
      this.currentProduct.images[this.currentImageIndex] = this.capturedImage;
      this.currentProduct.images = [...this.currentProduct.images];
    }
    this.closeCameraModal();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      const reader = new FileReader();

      reader.onload = (e: any) => {
        this.capturedImage = e.target.result;
        this.stopCamera();
      };

      reader.readAsDataURL(file);
    }
  }

  onImageSelected(event: Event, product: ReviewProduct, index: number): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      const reader = new FileReader();

      reader.onload = (e: any) => {
        if (!product.images) {
          product.images = [null, null, null, null, null];
        }
        product.images[index] = e.target.result;
 // Trigger change detection
        product.images = [...product.images];
      };

      reader.readAsDataURL(file);
    }
  }

  removeImage(product: ReviewProduct, index: number): void {
    if (product.images) {
      product.images[index] = null;
      product.images = [...product.images];
    }
  }

  submitReview(): void {
    if (this.canSubmit()) {
      this.submit.emit(this.internalProducts);
      this.closeModal(null);
    }
  }

  ngOnDestroy(): void {
    this.stopCamera();
  }
}
