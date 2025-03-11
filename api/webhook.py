import os
import json
from telegram import Update
from telegram.ext import Application, CommandHandler, MessageHandler, filters
from flask import Flask, request, jsonify

app = Flask(__name__)

# Bot token from environment variable
TELEGRAM_TOKEN = os.getenv("TELEGRAM_TOKEN")

# Set up your Telegram bot application
application = Application.builder().token(TELEGRAM_TOKEN).build()

# Webhook endpoint to handle requests from Telegram
@app.route(f"/{TELEGRAM_TOKEN}", methods=["POST"])
def webhook():
    # Get the data from Telegram
    update = Update.de_json(request.get_json(), application.bot)
    application.process_update(update)
    return jsonify({"status": "ok"})

# Add your command handlers (as you did in your bot.py)
async def start(update: Update, context):
    user = update.effective_user
    await update.message.reply_text(f"Hello, {user.first_name}!")

# Add the command handler to your application
application.add_handler(CommandHandler("start", start))

# Start the webhook
if __name__ == "__main__":
    # This is necessary to run Flask, but Vercel will invoke this serverless function
    app.run()
