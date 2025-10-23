from flask import Flask, send_file, request
import pyttsx3
import tempfile
import os
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

engine = pyttsx3.init()

# Configurar para usar voz feminina do Windows
voices = engine.getProperty('voices')
for voice in voices:
    if "ZIRA" in voice.id.upper():  # Voz feminina em inglês
        engine.setProperty('voice', voice.id)
        break

@app.route('/speak', methods=['POST'])
def speak():
    try:
        data = request.json
        text = data.get('text', '')
        
        # Criar arquivo temporário
        temp_dir = tempfile.gettempdir()
        temp_file = os.path.join(temp_dir, 'speech.mp3')
        
        # Gerar áudio
        engine.save_to_file(text, temp_file)
        engine.runAndWait()
        
        return send_file(temp_file, mimetype='audio/mp3')
    except Exception as e:
        return str(e), 500

if __name__ == '__main__':
    app.run(port=3001)
