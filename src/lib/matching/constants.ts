/**
 * Hemo Match - Matching Engine Configuration Constants
 *
 * NOTE: Proximity radius is an application matching configuration parameter,
 * NOT a medical or clinical rule. Clinical compatibility is determined solely
 * by serological and laboratory crossmatching.
 */

/**
 * Maximum geographic radius in kilometers for coordinate-based donor matching.
 * Candidates whose straight-line Haversine distance is <= MATCH_RADIUS_KM
 * are eligible for proximity matching.
 */
export const MATCH_RADIUS_KM = 5;
