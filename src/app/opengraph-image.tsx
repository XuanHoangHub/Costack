import { createSocialImage, socialImageSize } from '@/lib/socialImage';

export const alt = 'Apexa OS — Không gian làm việc AI hợp nhất';
export const size = socialImageSize;
export const contentType = 'image/png';

export default function OpenGraphImage() {
  return createSocialImage();
}
