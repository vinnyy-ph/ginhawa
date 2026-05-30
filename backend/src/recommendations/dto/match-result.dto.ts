import { PublicDoctorProfile } from '../../doctors/dto/public-doctor.dto';
import { MatchCriteria } from '../doctor-ranking.service';

export interface MatchedDoctor extends PublicDoctorProfile {
  avgRating: number;
  reviewCount: number;
  matchScore: number;
  matchReason: string;
}

export interface MatchResult {
  explanation: string;
  criteria: MatchCriteria;
  emergency: boolean;
  doctors: MatchedDoctor[];
}
