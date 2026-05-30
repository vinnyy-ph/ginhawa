import { PublicDoctorProfile } from '../../doctors/dto/public-doctor.dto';
import { MatchCriteria } from '../doctor-ranking.service';

/** A public doctor profile augmented with its ranking score and reason. */
export interface MatchedDoctor extends PublicDoctorProfile {
  avgRating: number;
  reviewCount: number;
  matchScore: number;
  matchReason: string;
}

/**
 * Response body of `POST /recommendations/match`.
 * `doctors` is empty when `emergency` is true or no doctors matched.
 */
export interface MatchResult {
  explanation: string;
  criteria: MatchCriteria;
  emergency: boolean;
  doctors: MatchedDoctor[];
}
