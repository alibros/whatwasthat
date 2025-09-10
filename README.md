# WhatWasThat

A beautiful web application that helps you identify movies and TV shows from descriptions, powered by OpenAI and enhanced with rich metadata from TMDB.

## Features

- 🎬 **Smart Content Recognition**: Describe a scene and get accurate movie/TV show identification
- 🖼️ **Rich Visual Experience**: Beautiful cards with posters, backdrops, and cast photos
- ⏰ **Timestamp Detection**: Find specific moments within episodes or movies
- 📺 **Comprehensive Details**: Ratings, cast, crew, genres, and plot summaries
- 📱 **Responsive Design**: Works perfectly on desktop and mobile

## Setup

### 1. Get a TMDB API Key

1. Go to [TMDB](https://www.themoviedb.org/)
2. Create a free account
3. Navigate to Settings → API
4. Request an API Key (choose "Developer")
5. Copy your API key

### 2. Configure Environment

Create a `.env` file in the project root:

```bash
TMDB_API_KEY=your_tmdb_api_key_here
PORT=3000
```

### 3. Install and Run

```bash
npm install
npm run dev
```

Visit `http://localhost:3000` and start asking about your favorite movies and shows!

## Examples

Try asking:

**Content Identification:**
- "Which South Park episode has them playing with toilet rolls?"
- "What's the movie where Tom Hanks is stuck on an island?"

**Scene-Specific Queries (automatically includes timestamps):**
- "The scene where they're in a diner talking about tipping in Pulp Fiction"
- "The part where Walter throws pizza on the roof in Breaking Bad"
- "The scene where Harry kills the snake in the second Potter film"
- "The moment when Neo dodges bullets in The Matrix"

**Explicit Timestamp Requests:**
- "When does Neo die in The Matrix?"
- "At what point do they talk about royales with cheese?"

## API

The application provides a `/ask` endpoint that accepts POST requests:

```json
{
  "question": "Your movie/TV question here"
}
```

Response includes both OpenAI identification and rich TMDB metadata with images, cast, ratings, and detailed information.

## Architecture

- **Frontend**: Modern HTML/CSS/JS with beautiful responsive design
- **Backend**: Express.js server with OpenAI integration
- **Data Sources**: 
  - OpenAI GPT for content identification
  - TMDB API for rich metadata, images, and cast information
- **Features**: Real-time search, loading states, error handling, and mobile-friendly UI
