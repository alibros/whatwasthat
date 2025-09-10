// TMDB API client for fetching movie and TV show metadata
// Get your free API key from: https://www.themoviedb.org/settings/api

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p';

// You'll need to set this environment variable or replace with your API key
const TMDB_API_KEY ="9446486c74568b60ef57318d997b367a"//process.env.TMDB_API_KEY;

if (!TMDB_API_KEY) {
    console.warn('TMDB_API_KEY not set. TMDB features will not work.');
}

async function tmdbRequest(endpoint, params = {}) {
    if (!TMDB_API_KEY) {
        throw new Error('TMDB API key not configured');
    }

    const url = new URL(`${TMDB_BASE_URL}${endpoint}`);
    url.searchParams.set('api_key', TMDB_API_KEY);
    
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

export async function searchMovie(title, year = null) {
    try {
        const params = { query: title };
        if (year) params.year = year;
        
        const data = await tmdbRequest('/search/movie', params);
        return data.results?.[0] || null;
    } catch (error) {
        console.error('TMDB movie search error:', error);
        return null;
    }
}

export async function searchTVShow(title, year = null) {
    try {
        const params = { query: title };
        if (year) params.first_air_date_year = year;
        
        const data = await tmdbRequest('/search/tv', params);
        return data.results?.[0] || null;
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
