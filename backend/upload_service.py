import os
import cloudinary
import cloudinary.uploader
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent / '.env')

TYPES_AUTORISES = {
    'application/pdf':                                                           'pdf',
    'image/jpeg':                                                                'jpg',
    'image/png':                                                                 'png',
    'application/msword':                                                        'doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document':  'docx',
}

TAILLE_MAX = 10 * 1024 * 1024  # 10 MB


def uploader_document(fichier, dossier_id: int, nom_doc: str) -> dict:
    # Recharger config Cloudinary à chaque appel
    cloudinary.config(
        cloud_name = os.getenv('CLOUDINARY_CLOUD_NAME'),
        api_key    = os.getenv('CLOUDINARY_API_KEY'),
        api_secret = os.getenv('CLOUDINARY_API_SECRET'),
        secure     = True
    )

    # Vérifier le type
    content_type = fichier.content_type
    if content_type not in TYPES_AUTORISES:
        raise ValueError("Type de fichier non autorisé. Types acceptés: PDF, JPG, PNG, DOC, DOCX")

    # Vérifier la taille
    fichier.seek(0, 2)
    taille = fichier.tell()
    fichier.seek(0)
    if taille > TAILLE_MAX:
        raise ValueError("Fichier trop volumineux. Maximum: 10 MB")

    # Upload vers Cloudinary
    dossier_cloud = f"infinity-compliance/dossiers/{dossier_id}"
    result = cloudinary.uploader.upload(
        fichier,
        folder          = dossier_cloud,
        resource_type   = 'auto',
        use_filename    = True,
        unique_filename = True,
        overwrite       = False,
    )

    return {
        'url':       result['secure_url'],
        'public_id': result['public_id'],
        'nom':       nom_doc or fichier.filename,
        'type':      TYPES_AUTORISES[content_type],
        'taille':    taille,
    }


def supprimer_document(public_id: str) -> bool:
    cloudinary.config(
        cloud_name = os.getenv('CLOUDINARY_CLOUD_NAME'),
        api_key    = os.getenv('CLOUDINARY_API_KEY'),
        api_secret = os.getenv('CLOUDINARY_API_SECRET'),
        secure     = True
    )
    try:
        result = cloudinary.uploader.destroy(public_id, resource_type='auto')
        return result.get('result') == 'ok'
    except Exception as e:
        print(f"[UPLOAD] Erreur suppression {public_id}: {e}")
        return False