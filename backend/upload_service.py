import os
import cloudinary
import cloudinary.uploader
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent / '.env')

cloudinary.config(
    cloud_name = os.getenv('CLOUDINARY_CLOUD_NAME'),
    api_key    = os.getenv('CLOUDINARY_API_KEY'),
    api_secret = os.getenv('CLOUDINARY_API_SECRET'),
    secure     = True
)

TYPES_AUTORISES = {
    'application/pdf':                                          'pdf',
    'image/jpeg':                                               'jpg',
    'image/png':                                                'png',
    'application/msword':                                       'doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
}

TAILLE_MAX = 10 * 1024 * 1024  # 10 MB


def uploader_document(fichier, dossier_id: int, nom_doc: str) -> dict:
    """
    Upload un fichier vers Cloudinary.
    Retourne: { url, public_id, nom, type, taille }
    """
    # Vérifier le type
    content_type = fichier.content_type
    if content_type not in TYPES_AUTORISES:
        raise ValueError(f"Type de fichier non autorisé. Types acceptés: PDF, JPG, PNG, DOC, DOCX")

    # Vérifier la taille
    fichier.seek(0, 2)  # aller à la fin
    taille = fichier.tell()
    fichier.seek(0)     # revenir au début
    if taille > TAILLE_MAX:
        raise ValueError(f"Fichier trop volumineux. Maximum: 10 MB")

    # Upload vers Cloudinary
    dossier_cloud = f"infinity-compliance/dossiers/{dossier_id}"
    result = cloudinary.uploader.upload(
        fichier,
        folder         = dossier_cloud,
        resource_type  = 'auto',
        use_filename   = True,
        unique_filename= True,
        overwrite      = False,
    )

    return {
        'url':       result['secure_url'],
        'public_id': result['public_id'],
        'nom':       nom_doc or fichier.filename,
        'type':      TYPES_AUTORISES[content_type],
        'taille':    taille,
    }


def supprimer_document(public_id: str) -> bool:
    try:
        result = cloudinary.uploader.destroy(public_id, resource_type='auto')
        return result.get('result') == 'ok'
    except Exception as e:
        print(f"[UPLOAD] Erreur suppression {public_id}: {e}")
        return False