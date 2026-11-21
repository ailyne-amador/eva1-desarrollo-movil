export interface Task {
  id: string;
  title: string;
  description: string | null;
  latitude: number | null;
  longitude: number | null;
  clientId: string | null;
  hasPhoto: boolean;
  createdAt?: string;
  updatedAt?: string;
}
