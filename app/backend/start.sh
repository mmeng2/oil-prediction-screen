#!/bin/bash

# Quick start script for backend server

echo "🚀 Starting Oil Prediction Screen Backend Server"
echo "================================================"

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "⚠️  .env file not found. Creating from .env.example..."
    cp .env.example .env
    echo "✓ Created .env file. Please edit it with your configuration."
    echo ""
fi

# Check if running in mock mode
if [ "$1" == "--mock" ]; then
    echo "🎭 Running in MOCK mode (AI stubs enabled)"
    export AI_MOCK_ENABLED=true
    shift
fi

# Install dependencies if needed
if [ "$1" == "--install" ]; then
    echo "📦 Installing dependencies..."
    pip install -r requirements.txt
    echo "✓ Dependencies installed"
    echo ""
    shift
fi

# Show configuration
echo "⚙️  Configuration:"
echo "   - AI Provider: ${AI_PROVIDER:-openai}"
echo "   - Mock Mode: ${AI_MOCK_ENABLED:-false}"
echo "   - Debug: ${DEBUG:-false}"
echo ""

# Start server
echo "🌐 Starting server on http://0.0.0.0:${PORT:-8000}"
echo "================================================"
python main.py
