export interface ResultScore {
  id: number;
  resultId: number;
  eventItemId: number;
  score: number;
  matchCount: number;
  totalCharacteristics: number;
  name: string;
  eventItem?: {
    id: number;
    name: string;
  };
}
