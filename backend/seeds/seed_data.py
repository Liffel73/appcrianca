"""
Script para popular banco de dados com dados iniciais

Uso:
    python -m backend.seeds.seed_data

Ou dentro do Python:
    from backend.seeds.seed_data import seed_database
    seed_database()
"""
import sys
import os

# Add paths
sys.path.append('.')
sys.path.append('./backend')

from backend.app.core.database import SessionLocal, init_db
from backend.app.models import Environment, Room, GameObject, Phrase


def seed_environments():
    """Criar ambientes iniciais"""
    db = SessionLocal()
    try:
        # Verificar se já existe
        if db.query(Environment).first():
            print("AVISO - Ambientes ja existem, pulando...")
            return

        environments = [
            Environment(
                name="house",
                name_pt="Casa",
                emoji="🏠",
                description="Explore os cômodos de uma casa típica",
                display_order=1
            ),
            Environment(
                name="school",
                name_pt="Escola",
                emoji="🏫",
                description="Aprenda vocabulário escolar",
                display_order=2
            ),
            Environment(
                name="park",
                name_pt="Parque",
                emoji="🌳",
                description="Diversão ao ar livre",
                display_order=3
            )
        ]

        db.add_all(environments)
        db.commit()
        print("OK - Ambientes criados: Casa, Escola, Parque")

    except Exception as e:
        print(f"ERRO - ao criar ambientes: {e}")
        db.rollback()
    finally:
        db.close()


def seed_rooms():
    """Criar cômodos"""
    db = SessionLocal()
    try:
        if db.query(Room).first():
            print("AVISO -  Cômodos já existem, pulando...")
            return

        # Buscar ambientes
        house = db.query(Environment).filter_by(name="house").first()
        school = db.query(Environment).filter_by(name="school").first()
        park = db.query(Environment).filter_by(name="park").first()

        rooms = [
            # Casa
            Room(
                environment_id=house.id,
                name="living_room",
                name_pt="Sala de Estar",
                description="Sala principal da casa",
                background_color="#F5F5DC",
                display_order=1
            ),
            Room(
                environment_id=house.id,
                name="kitchen",
                name_pt="Cozinha",
                description="Onde preparamos as refeições",
                background_color="#FFF8DC",
                display_order=2
            ),
            Room(
                environment_id=house.id,
                name="bedroom",
                name_pt="Quarto",
                description="Onde dormimos e descansamos",
                background_color="#E6E6FA",
                display_order=3
            ),
            Room(
                environment_id=house.id,
                name="bathroom",
                name_pt="Banheiro",
                description="Higiene pessoal",
                background_color="#F0FFFF",
                display_order=4
            ),
            # Escola
            Room(
                environment_id=school.id,
                name="classroom",
                name_pt="Sala de Aula",
                description="Onde aprendemos",
                background_color="#F0F8FF",
                display_order=1
            ),
            # Parque
            Room(
                environment_id=park.id,
                name="playground",
                name_pt="Playground",
                description="Área de brincar",
                background_color="#87CEEB",
                display_order=1
            )
        ]

        db.add_all(rooms)
        db.commit()
        print("OK - Cômodos criados: 6 cômodos em 3 ambientes")

    except Exception as e:
        print(f"ERRO - Erro ao criar cômodos: {e}")
        db.rollback()
    finally:
        db.close()


def seed_objects_living_room():
    """Objetos da sala de estar"""
    db = SessionLocal()
    try:
        if db.query(GameObject).first():
            print("AVISO -  Objetos já existem, pulando...")
            return

        living_room = db.query(Room).filter_by(name="living_room").first()

        objects = [
            GameObject(
                room_id=living_room.id,
                unique_id="sofa-living-room",
                word="sofa",
                short_word="sofa",
                translation="sofá",
                category="furniture",
                difficulty=1,
                shape="box",
                color="#8B4513",
                position_x=-2, position_y=0, position_z=0,
                scale_x=2, scale_y=1, scale_z=1,
                model_type="gltf",
                model_path="/models/living-room/sofa.glb",
                ipa="/ˈsoʊ.fə/",
                syllables=["so", "fa"],
                definition_pt="Móvel estofado onde sentamos para relaxar",
                definition_en="Upholstered furniture where we sit to relax",
                common_uses=["Assistir TV", "Relaxar", "Receber visitas"],
                clickable=True,
                hoverable=True
            ),
            GameObject(
                room_id=living_room.id,
                unique_id="table-living-room",
                word="table",
                translation="mesa",
                category="furniture",
                difficulty=1,
                shape="box",
                color="#D2691E",
                position_x=0, position_y=0, position_z=1,
                scale_x=1, scale_y=0.5, scale_z=1,
                model_type="gltf",
                model_path="/models/living-room/table.glb",
                ipa="/ˈteɪ.bəl/",
                syllables=["ta", "ble"],
                definition_pt="Móvel plano onde colocamos objetos",
                definition_en="Flat furniture where we place objects",
                common_uses=["Colocar objetos", "Comer", "Trabalhar"],
                clickable=True,
                hoverable=True
            ),
            GameObject(
                room_id=living_room.id,
                unique_id="tv-living-room",
                word="television",
                short_word="TV",
                translation="televisão",
                category="electronics",
                difficulty=1,
                shape="box",
                color="#2F4F4F",
                position_x=0, position_y=1, position_z=-2,
                scale_x=2, scale_y=1, scale_z=0.2,
                model_type="gltf",
                model_path="/models/living-room/tv.glb",
                ipa="/ˈtel.ɪ.vɪʒ.ən/",
                syllables=["tel", "e", "vi", "sion"],
                definition_pt="Aparelho eletrônico para assistir programas",
                definition_en="Electronic device to watch programs",
                common_uses=["Assistir filmes", "Ver notícias", "Jogar videogame"],
                fun_facts=[
                    "📺 A palavra vem do Grego 'tele' (longe) + Latin 'visio' (visão)",
                    "🌍 Em inglês britânico, também chamam de 'telly'",
                    "🎬 A primeira transmissão de TV foi em 1927"
                ],
                clickable=True,
                hoverable=True
            )
        ]

        db.add_all(objects)
        db.commit()
        print("OK - Objetos da sala de estar criados: 3 objetos")

    except Exception as e:
        print(f"ERRO - Erro ao criar objetos: {e}")
        db.rollback()
    finally:
        db.close()


def seed_phrases():
    """Frases contextuais para objetos"""
    db = SessionLocal()
    try:
        if db.query(Phrase).first():
            print("AVISO -  Frases já existem, pulando...")
            return

        tv = db.query(GameObject).filter_by(word="television").first()
        sofa = db.query(GameObject).filter_by(word="sofa").first()

        if not tv or not sofa:
            print("AVISO -  Objetos não encontrados, pulando frases...")
            return

        phrases = [
            # TV
            Phrase(
                object_id=tv.id,
                situation="asking_permission",
                situation_pt="Pedindo Permissão",
                phrase_pt="Posso assistir TV?",
                phrase_en="Can I watch TV?",
                difficulty=1,
                is_ai_generated=False
            ),
            Phrase(
                object_id=tv.id,
                situation="describing_action",
                situation_pt="Descrevendo Ação",
                phrase_pt="Eu estou assistindo TV",
                phrase_en="I am watching TV",
                difficulty=1,
                is_ai_generated=False
            ),
            Phrase(
                object_id=tv.id,
                situation="talking_routine",
                situation_pt="Falando sobre Rotina",
                phrase_pt="Eu assisto TV todo dia",
                phrase_en="I watch TV every day",
                difficulty=1,
                is_ai_generated=False
            ),
            # Sofá
            Phrase(
                object_id=sofa.id,
                situation="describing_location",
                situation_pt="Descrevendo Localização",
                phrase_pt="O sofá está na sala",
                phrase_en="The sofa is in the living room",
                difficulty=1,
                is_ai_generated=False
            ),
            Phrase(
                object_id=sofa.id,
                situation="describing_action",
                situation_pt="Estou sentado no sofá",
                phrase_en="I am sitting on the sofa",
                phrase_pt="I am sitting on the sofa",
                difficulty=1,
                is_ai_generated=False
            )
        ]

        db.add_all(phrases)
        db.commit()
        print("OK - Frases criadas: 5 frases para TV e Sofá")

    except Exception as e:
        print(f"ERRO - Erro ao criar frases: {e}")
        db.rollback()
    finally:
        db.close()


def seed_database():
    """Executar todos os seeds"""
    print("=" * 60)
    print("Iniciando seed do banco de dados...")
    print("=" * 60)

    # Inicializar banco (criar tabelas)
    print("\n1. Inicializando tabelas...")
    init_db()

    # Executar seeds
    print("\n2. Criando ambientes...")
    seed_environments()

    print("\n3. Criando cômodos...")
    seed_rooms()

    print("\n4. Criando objetos...")
    seed_objects_living_room()

    print("\n5. Criando frases...")
    seed_phrases()

    print("\n" + "=" * 60)
    print("Seed completo! Banco de dados populado com sucesso!")
    print("=" * 60)
    print("\nDados criados:")
    print("  - 3 Ambientes (Casa, Escola, Parque)")
    print("  - 6 Cômodos")
    print("  - 3 Objetos (Sala de Estar)")
    print("  - 5 Frases contextuais")
    print("\n" + "=" * 60)


if __name__ == "__main__":
    seed_database()
