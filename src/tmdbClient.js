// TMDB API client for fetching movie and TV show metadata
// Get your free API key from: https://www.themoviedb.org/settings/api

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p';

// Lazy getter for TMDB API key to ensure environment variables are loaded
function getTMDBApiKey() {
    const key = process.env.TMDB_API_KEY;
    if (!key) {
        console.warn('TMDB_API_KEY not set. TMDB features will not work.');
    }
    return key;
}

export async function tmdbRequest(endpoint, params = {}) {
    const apiKey = getTMDBApiKey();
    if (!apiKey) {
        throw new Error('TMDB API key not configured');
    }

    const url = new URL(`${TMDB_BASE_URL}${endpoint}`);
    url.searchParams.set('api_key', apiKey);
    
    Object.entries(params).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
            url.searchParams.set(key, value);
        }
    });

    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`TMDB API error: ${response.status} ${response.statusText}`);
    }
    
    return response.json();
}

export function getImageUrl(path, size = 'w500') {
    if (!path) return null;
    return `${TMDB_IMAGE_BASE_URL}/${size}${path}`;
}

// Helper function to clean and extract core title from verbose OpenAI responses
function generateTitleVariations(title) {
    const variations = [];
    
    // Original title
    variations.push(title);
    
    // Remove content in parentheses (cast info, years, etc.)
    const withoutParens = title.replace(/\s*\([^)]*\)\s*/g, '').trim();
    if (withoutParens && withoutParens !== title) {
        variations.push(withoutParens);
    }
    
    // Remove content after em dash or long dash (additional info)
    const withoutDash = title.replace(/\s*[—–-]\s*.*$/, '').trim();
    if (withoutDash && withoutDash !== title && !variations.includes(withoutDash)) {
        variations.push(withoutDash);
    }
    
    // Remove year patterns at the end
    const withoutYear = title.replace(/\s*\(\d{4}\)\s*$/, '').trim();
    if (withoutYear && withoutYear !== title && !variations.includes(withoutYear)) {
        variations.push(withoutYear);
    }
    
    // Remove "The" prefix as a last resort (for better matching)
    const withoutThe = title.replace(/^The\s+/i, '').trim();
    if (withoutThe && withoutThe !== title && !variations.includes(withoutThe)) {
        variations.push(withoutThe);
    }
    
    // Remove duplicates and empty strings
    return variations.filter((v, i, arr) => v && arr.indexOf(v) === i);
}

// Helper function to score search results for relevance
function scoreMovieResult(result, originalTitle, searchTitle) {
    let score = 0;
    
    // Exact title match gets highest score
    if (result.title.toLowerCase() === searchTitle.toLowerCase()) {
        score += 100;
    }
    
    // Partial title match
    if (result.title.toLowerCase().includes(searchTitle.toLowerCase()) || 
        searchTitle.toLowerCase().includes(result.title.toLowerCase())) {
        score += 50;
    }
    
    // Popularity score (vote count and average)
    score += Math.min(result.vote_count / 100, 20); // Max 20 points for popularity
    score += result.vote_average * 2; // Max ~20 points for rating
    
    // Recency bonus (prefer newer releases for ambiguous matches)
    if (result.release_date) {
        const releaseYear = new Date(result.release_date).getFullYear();
        const currentYear = new Date().getFullYear();
        if (releaseYear >= currentYear - 5) {
            score += 10; // Recent release bonus
        }
    }
    
    return score;
}

export async function searchMovie(title, year = null) {
    try {
        const titleVariations = generateTitleVariations(title);
        let bestResult = null;
        let bestScore = 0;
        
        for (const searchTitle of titleVariations) {
            const params = { query: searchTitle };
            if (year) params.year = year;
            
            const data = await tmdbRequest('/search/movie', params);
            
            if (data.results && data.results.length > 0) {
                // Score all results and find the best one
                for (const result of data.results.slice(0, 5)) { // Only consider top 5 results
                    const score = scoreMovieResult(result, title, searchTitle);
                    if (score > bestScore) {
                        bestScore = score;
                        bestResult = result;
                    }
                }
                
                // If we found a high-confidence match, stop searching
                if (bestScore >= 100) {
                    break;
                }
            }
        }
        
        return bestResult;
    } catch (error) {
        console.error('TMDB movie search error:', error);
        return null;
    }
}

// Helper function to score TV show results for relevance
function scoreTVResult(result, originalTitle, searchTitle) {
    let score = 0;
    
    // Exact title match gets highest score
    if (result.name.toLowerCase() === searchTitle.toLowerCase()) {
        score += 100;
    }
    
    // Partial title match
    if (result.name.toLowerCase().includes(searchTitle.toLowerCase()) || 
        searchTitle.toLowerCase().includes(result.name.toLowerCase())) {
        score += 50;
    }
    
    // Popularity score (vote count and average)
    score += Math.min(result.vote_count / 100, 20); // Max 20 points for popularity
    score += result.vote_average * 2; // Max ~20 points for rating
    
    // Country-specific matching for shows with regional versions
    if (originalTitle.includes('(UK)') || originalTitle.includes('UK')) {
        if (result.origin_country?.includes('GB')) {
            score += 30; // Strong preference for UK version
        }
        // Prefer older shows (original versions) for UK requests
        if (result.first_air_date) {
            const year = new Date(result.first_air_date).getFullYear();
            if (year <= 2005) score += 20; // Bonus for older shows
        }
    } else if (originalTitle.includes('(US)') || originalTitle.includes('US')) {
        if (result.origin_country?.includes('US')) {
            score += 30; // Strong preference for US version
        }
    }
    
    // General recency bonus for non-country-specific searches
    if (!originalTitle.includes('(UK)') && !originalTitle.includes('(US)') && result.first_air_date) {
        const releaseYear = new Date(result.first_air_date).getFullYear();
        const currentYear = new Date().getFullYear();
        if (releaseYear >= currentYear - 10) {
            score += 5; // Small bonus for recent shows
        }
    }
    
    return score;
}

export async function searchTVShow(title, year = null) {
    try {
        const titleVariations = generateTitleVariations(title);
        let bestResult = null;
        let bestScore = 0;
        
        for (const searchTitle of titleVariations) {
            const params = { query: searchTitle };
            if (year) params.first_air_date_year = year;
            
            const data = await tmdbRequest('/search/tv', params);
            
            if (data.results && data.results.length > 0) {
                // Score all results and find the best one
                for (const result of data.results.slice(0, 10)) { // Consider more TV results due to regional versions
                    const score = scoreTVResult(result, title, searchTitle);
                    if (score > bestScore) {
                        bestScore = score;
                        bestResult = result;
                    }
                }
                
                // If we found a high-confidence match, stop searching
                if (bestScore >= 100) {
                    break;
                }
            }
        }
        
        return bestResult;
    } catch (error) {
        console.error('TMDB TV search error:', error);
        return null;
    }
}

export async function getMovieDetails(movieId) {
    try {
        const data = await tmdbRequest(`/movie/${movieId}`, {
            append_to_response: 'credits,videos'
        });
        
        return {
            id: data.id,
            title: data.title,
            overview: data.overview,
            poster_path: getImageUrl(data.poster_path, 'w500'),
            backdrop_path: getImageUrl(data.backdrop_path, 'w1280'),
            release_date: data.release_date,
            runtime: data.runtime,
            vote_average: data.vote_average,
            vote_count: data.vote_count,
            genres: data.genres?.map(g => g.name) || [],
            cast: data.credits?.cast?.slice(0, 5)?.map(person => ({
                name: person.name,
                character: person.character,
                profile_path: getImageUrl(person.profile_path, 'w185')
            })) || [],
            director: data.credits?.crew?.find(person => person.job === 'Director')?.name || null,
            trailer: data.videos?.results?.find(video => 
                video.type === 'Trailer' && video.site === 'YouTube'
            )?.key || null
        };
    } catch (error) {
        console.error('TMDB movie details error:', error);
        return null;
    }
}

export async function getTVShowDetails(tvId) {
    try {
        const data = await tmdbRequest(`/tv/${tvId}`, {
            append_to_response: 'credits,videos'
        });
        
        return {
            id: data.id,
            name: data.name,
            overview: data.overview,
            poster_path: getImageUrl(data.poster_path, 'w500'),
            backdrop_path: getImageUrl(data.backdrop_path, 'w1280'),
            first_air_date: data.first_air_date,
            last_air_date: data.last_air_date,
            number_of_seasons: data.number_of_seasons,
            number_of_episodes: data.number_of_episodes,
            vote_average: data.vote_average,
            vote_count: data.vote_count,
            genres: data.genres?.map(g => g.name) || [],
            networks: data.networks?.map(n => n.name) || [],
            cast: data.credits?.cast?.slice(0, 5)?.map(person => ({
                name: person.name,
                character: person.character,
                profile_path: getImageUrl(person.profile_path, 'w185')
            })) || [],
            created_by: data.created_by?.map(creator => creator.name) || [],
            trailer: data.videos?.results?.find(video => 
                video.type === 'Trailer' && video.site === 'YouTube'
            )?.key || null
        };
    } catch (error) {
        console.error('TMDB TV details error:', error);
        return null;
    }
}

export async function getEpisodeDetails(tvId, seasonNumber, episodeNumber) {
    try {
        const data = await tmdbRequest(`/tv/${tvId}/season/${seasonNumber}/episode/${episodeNumber}`);
        
        return {
            id: data.id,
            name: data.name,
            overview: data.overview,
            still_path: getImageUrl(data.still_path, 'w500'),
            air_date: data.air_date,
            episode_number: data.episode_number,
            season_number: data.season_number,
            runtime: data.runtime,
            vote_average: data.vote_average,
            vote_count: data.vote_count
        };
    } catch (error) {
        console.error('TMDB episode details error:', error);
        return null;
    }
}

export async function enrichMediaData(openaiResult) {
    if (openaiResult.status !== 'success') {
        return openaiResult;
    }

    try {
        let tmdbData = null;
        let episodeData = null;

        if (openaiResult.type === 'movie') {
            const searchResult = await searchMovie(openaiResult.movie_title);
            if (searchResult) {
                tmdbData = await getMovieDetails(searchResult.id);
            }
        } else if (openaiResult.type === 'series') {
            const searchResult = await searchTVShow(openaiResult.series_title);
            if (searchResult) {
                tmdbData = await getTVShowDetails(searchResult.id);
                
                // Try to get specific episode data
                if (openaiResult.season_number && openaiResult.episode_number) {
                    episodeData = await getEpisodeDetails(
                        searchResult.id,
                        openaiResult.season_number,
                        openaiResult.episode_number
                    );
                }
            }
        }

        return {
            ...openaiResult,
            tmdb_data: tmdbData,
            episode_data: episodeData
        };
    } catch (error) {
        console.error('Error enriching media data:', error);
        // Return original result if TMDB enrichment fails
        return openaiResult;
    }
}
