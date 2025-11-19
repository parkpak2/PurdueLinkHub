# Purdue Link Hub - Backend Server

Backend server for usage tracking and trending links analytics.

## Features

- **Usage Tracking**: Log link clicks from the frontend
- **Trending Analytics**: Get most popular links by time range
- **Statistics**: Overall usage statistics
- **JSON Storage**: Simple file-based storage (no database required)

## Installation

```bash
cd server
npm install
```

## Running the Server

```bash
npm start
```

The server will start on `http://localhost:3000`

## API Endpoints

### POST /api/usage
Log a link click event

**Request:**
```json
{
  "linkId": "brightspace",
  "name": "Brightspace",
  "category": "Academics"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Usage logged successfully",
  "data": {
    "linkId": "brightspace",
    "name": "Brightspace",
    "category": "Academics",
    "timestamp": "2024-11-19T12:00:00.000Z"
  }
}
```

### GET /api/popular
Get trending links

**Query Parameters:**
- `range`: Time range ("7d", "30d", "all") - default: "7d"
- `limit`: Max results (default: 10)

**Example:**
```
GET /api/popular?range=7d&limit=5
```

**Response:**
```json
{
  "success": true,
  "range": "7d",
  "total": 150,
  "results": 5,
  "data": [
    {
      "linkId": "brightspace",
      "name": "Brightspace",
      "count": 45
    },
    {
      "linkId": "mypurdue",
      "name": "MyPurdue",
      "count": 32
    }
  ]
}
```

### GET /api/stats
Get overall statistics

**Response:**
```json
{
  "success": true,
  "data": {
    "totalClicks": 150,
    "uniqueLinks": 12,
    "last24h": 25,
    "last7d": 150,
    "last30d": 350
  }
}
```

### DELETE /api/usage/clear
Clear all usage data (for testing)

**Response:**
```json
{
  "success": true,
  "message": "All usage data cleared"
}
```

### GET /health
Health check endpoint

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-11-19T12:00:00.000Z",
  "uptime": 123.456
}
```

## Data Storage

Data is stored in JSON files in the `server/data/` directory:

- `usage-log.json`: Raw log of all link clicks
- `stats.json`: Aggregated statistics for quick access

## Development

The server automatically creates the data directory and files on first run.

To reset all data:
```bash
curl -X DELETE http://localhost:3000/api/usage/clear
```

## CORS

CORS is enabled for all origins to allow frontend development.

## Port Configuration

Default port is 3000. To use a different port:

```bash
PORT=8080 npm start
```
