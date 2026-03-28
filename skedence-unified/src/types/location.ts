import { Timestamp } from 'firebase/firestore';

export interface Location {
  id: string;
  name: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  zipCode: string;
  orgId: string;
  isActive: boolean;
  isVisibleToClients?: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
