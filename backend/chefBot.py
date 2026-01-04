from flask import Blueprint, render_template, request, jsonify, session
from dotenv import load_dotenv
import os
from huggingface_hub import InferenceClient

# Load environment variables
dotenv_path = os.path.join(os.path.dirname(__file__), '.env')
if os.path.exists(dotenv_path):
    load_dotenv(dotenv_path=dotenv_path)

chef_bot_bp = Blueprint(
    'chef_bot_bp',
    __name__,
    template_folder='../frontend/pages/html'
)

# Configuration for Hugging Face Inference API
HF_API_KEY = os.getenv('HUGGINGFACE_API_KEY')
MODEL = "meta-llama/Llama-3.2-3B-Instruct"
client = InferenceClient(token=HF_API_KEY) if HF_API_KEY else None

DEFAULT_CONTEXT = "No specific recipe provided. Assist with general cooking advice."

@chef_bot_bp.route('/set_recipe', methods=['POST'])
def set_recipe():
    # Formats the recipe JSON and stores it in the session context.
    recipe = request.get_json()
    if not recipe:
        return jsonify({'status': 'error'}), 400

    # Build a concise context string for the AI
    parts = [f"Recipe: {recipe.get('title', 'Unknown')}"]
    
    ingredients = recipe.get('ingredients', [])
    if ingredients:
        parts.append("\nINGREDIENTS:")
        for ing in ingredients:
            if isinstance(ing, dict):
                parts.append(f"- {ing.get('name')} {ing.get('quantity', '')} {ing.get('unit', '')}")
            else:
                parts.append(f"- {ing}")

    steps = recipe.get('steps', [])
    if steps:
        parts.append("\nSTEPS:")
        for i, step in enumerate(steps, 1):
            parts.append(f"{i}. {step}")

    session['recipe_context'] = "\n".join(parts).strip()
    return jsonify({'status': 'success'})

@chef_bot_bp.route('/chat', methods=['POST'])
def chat():
    # Handles the chat logic using Hugging Face Inference API.
    if not client:
        return jsonify({'error': 'Bot not configured'}), 503

    user_message = request.json.get('message')
    if not user_message:
        return jsonify({'error': 'Empty message'}), 400

    # Manage chat history to stay within cookie size limits (last 6 messages)
    chat_history = session.get('chat_history', [])
    chat_history = chat_history[-6:]
    
    recipe_context = session.get('recipe_context', DEFAULT_CONTEXT)

    # Construct the payload
    messages = [
        {
            "role": "system",
            "content": (
                "You are Chef Bot Assistant 👨‍🍳. "
                f"Reference this recipe:\n{recipe_context}\n"
                "Guidelines: Only answer cooking-related questions. Be friendly. "
                "Use max 2 emojis. Respond in the user's language."
            )
        }
    ] + chat_history + [{"role": "user", "content": user_message}]

    try:
        response = client.chat_completion(
            model=MODEL,
            messages=messages,
            max_tokens=500,
            temperature=0.7
        )
        
        bot_response = response.choices[0].message.content
        
        # Update history
        chat_history.append({'role': 'user', 'content': user_message})
        chat_history.append({'role': 'assistant', 'content': bot_response})
        session['chat_history'] = chat_history
        
        return jsonify({'response': bot_response, 'status': 'success'})
    except Exception:
        return jsonify({'error': 'AI Communication Error'}), 500