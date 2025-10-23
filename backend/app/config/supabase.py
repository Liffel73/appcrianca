"""
Configuração do Supabase para o backend FastAPI
"""
import os
from typing import Optional
from supabase import create_client, Client
from dotenv import load_dotenv

# Carrega variáveis de ambiente
load_dotenv()


class SupabaseConfig:
    """Configuração e cliente Supabase"""

    _client: Optional[Client] = None

    @classmethod
    def get_client(cls) -> Client:
        """
        Retorna uma instância do cliente Supabase (singleton)

        Usa a SERVICE_ROLE_KEY no backend para ter acesso total ao banco
        (necessário para operações administrativas e bypass do RLS quando apropriado)
        """
        if cls._client is None:
            supabase_url = os.getenv("SUPABASE_URL")
            supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

            if not supabase_url or not supabase_key:
                raise ValueError(
                    "SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY devem estar definidos no .env"
                )

            cls._client = create_client(supabase_url, supabase_key)
            print(f"✅ Supabase conectado: {supabase_url}")

        return cls._client

    @classmethod
    def get_anon_client(cls) -> Client:
        """
        Retorna cliente Supabase com chave anon (limitado por RLS)

        Use este cliente quando quiser testar permissões RLS
        ou quando fizer operações em nome de um usuário específico
        """
        supabase_url = os.getenv("SUPABASE_URL")
        supabase_anon_key = os.getenv("SUPABASE_ANON_KEY")

        if not supabase_url or not supabase_anon_key:
            raise ValueError(
                "SUPABASE_URL e SUPABASE_ANON_KEY devem estar definidos no .env"
            )

        return create_client(supabase_url, supabase_anon_key)


# Cliente global (para usar em endpoints)
supabase: Client = SupabaseConfig.get_client()


# Funções auxiliares
def get_user_by_id(user_id: str):
    """Busca perfil de usuário por ID"""
    response = supabase.table("profiles").select("*").eq("id", user_id).execute()
    return response.data[0] if response.data else None


def get_user_by_username(username: str):
    """Busca perfil de usuário por username"""
    response = supabase.table("profiles").select("*").eq("username", username).execute()
    return response.data[0] if response.data else None


def log_activity(user_id: str, activity_type: str, activity_data: dict = None, ip_address: str = None):
    """
    Registra atividade do usuário para monitoramento

    Args:
        user_id: UUID do usuário
        activity_type: Tipo de atividade (ex: "login", "word_learned", "quiz_completed")
        activity_data: Dados adicionais da atividade (JSONB)
        ip_address: IP do usuário
    """
    supabase.table("activity_logs").insert({
        "user_id": user_id,
        "activity_type": activity_type,
        "activity_data": activity_data or {},
        "ip_address": ip_address
    }).execute()


def verify_jwt_token(token: str):
    """
    Verifica se um JWT token é válido

    Args:
        token: JWT token do usuário

    Returns:
        User data se válido, None se inválido
    """
    try:
        user = supabase.auth.get_user(token)
        return user
    except Exception as e:
        print(f"❌ Token inválido: {e}")
        return None
