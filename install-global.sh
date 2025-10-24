#!/bin/bash

# Background Agents Global Installation Script
# This script makes the background agents framework available globally

set -e

echo "🚀 Installing Background Agents globally..."

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
FRAMEWORK_DIR="$SCRIPT_DIR"

# Create global bin directory if it doesn't exist
GLOBAL_BIN="/usr/local/bin"
if [ ! -d "$GLOBAL_BIN" ]; then
    echo "📁 Creating global bin directory..."
    sudo mkdir -p "$GLOBAL_BIN"
fi

# Create symlink for the CLI tool
CLI_PATH="$FRAMEWORK_DIR/bin/bg-agents"
GLOBAL_CLI_PATH="$GLOBAL_BIN/bg-agents"

echo "🔗 Creating symlink for CLI tool..."

# Remove existing symlink if it exists
if [ -L "$GLOBAL_CLI_PATH" ] || [ -f "$GLOBAL_CLI_PATH" ]; then
    echo "🗑️  Removing existing installation..."
    sudo rm -f "$GLOBAL_CLI_PATH"
fi

# Create new symlink
sudo ln -s "$CLI_PATH" "$GLOBAL_CLI_PATH"

# Make sure the script is executable
chmod +x "$CLI_PATH"

echo "✅ Background Agents CLI installed globally!"
echo ""
echo "🎉 You can now use 'bg-agents' from anywhere!"
echo ""
echo "📝 Quick start:"
echo "   bg-agents init                    # Initialize in current directory"
echo "   bg-agents init /path/to/project   # Initialize in specific directory"
echo "   bg-agents create monitor          # Create a monitor agent"
echo "   bg-agents start                   # Start agents"
echo "   bg-agents help                    # Show all commands"
echo ""
echo "📚 Documentation: https://github.com/matiasportugau-ui/background-agents"
