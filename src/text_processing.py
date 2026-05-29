"""
Módulo de procesamiento lingüístico con SpaCy.
Extracción optimizada de pares (Aspecto, Adjetivo) usando nlp.pipe().
"""

import logging
from typing import List, Dict, Generator
import spacy
from spacy.tokens import Doc

logger = logging.getLogger(__name__)


def cargar_modelo_spacy(modelo: str = "es_core_news_md") -> spacy.Language:
    """
    Carga el modelo de SpaCy deshabilitando componentes no necesarios
    para ahorrar memoria y acelerar el procesamiento.
    
    Args:
        modelo: Nombre del modelo de SpaCy a cargar.
    
    Returns:
        Objeto nlp de SpaCy.
    """
    logger.info(f"Cargando modelo SpaCy: {modelo}")
    nlp = spacy.load(
        modelo,
        disable=["ner", "textcat", "entity_linker"]
    )
    return nlp


def extraer_aspectos_adjetivos(doc: Doc) -> List[Dict[str, str]]:
    """
    Extrae pares (sustantivo aspecto, adjetivo modificador) de un Doc de SpaCy.
    Busca tokens NOUN/PROPN y sus dependientes amod (adjetivos modificadores).
    
    Args:
        doc: Documento procesado por SpaCy.
    
    Returns:
        Lista de diccionarios con aspecto, adjetivo y fragmento original.
    """
    resultados = []
    
    for sent in doc.sents:
        for token in sent:
            # Identificar sustantivos como posibles aspectos
            if token.pos_ in ("NOUN", "PROPN"):
                # Buscar adjetivos que dependan directamente del sustantivo
                adjetivos = [
                    child for child in token.children 
                    if child.dep_ == "amod" and child.pos_ == "ADJ"
                ]
                
                for adj in adjetivos:
                    fragmento = doc[token.i:adj.i + 1].text
                    resultados.append({
                        "aspecto_lematizado": token.lemma_.lower(),
                        "adjetivo": adj.text.lower(),
                        "adjetivo_lematizado": adj.lemma_.lower(),
                        "fragmento": fragmento,
                        "dep": adj.dep_,
                        "pos_aspecto": token.pos_,
                        "pos_adjetivo": adj.pos_
                    })
    
    return resultados


def procesar_textos_spacy(
    textos: List[str],
    nlp: spacy.Language,
    batch_size: int = 256,
    n_process: int = 1
) -> Generator[List[Dict[str, str]], None, None]:
    """
    Procesa una lista de textos usando nlp.pipe() para máxima eficiencia.
    Genera listas de aspectos extraídos por cada texto.
    
    Args:
        textos: Lista de strings (reseñas).
        nlp: Modelo SpaCy cargado.
        batch_size: Tamaño de lote para nlp.pipe().
        n_process: Procesos paralelos (1 para Colab/GPU).
    
    Yields:
        Lista de diccionarios con aspectos extraídos por texto.
    """
    logger.info(f"Iniciando extracción con SpaCy: {len(textos)} textos, batch={batch_size}")
    
    total_errores = 0
    total_aspectos = 0
    
    for doc in nlp.pipe(textos, batch_size=batch_size, n_process=n_process):
        try:
            aspectos = extraer_aspectos_adjetivos(doc)
            total_aspectos += len(aspectos)
            yield aspectos
        except Exception as e:
            total_errores += 1
            logger.error(f"Error procesando texto: {str(e)}")
            yield []
    
    logger.info(
        f"Extracción finalizada: {total_aspectos} aspectos encontrados, "
        f"{total_errores} errores"
    )


def extraer_fragmentos_para_bert(
    textos: List[str],
    ids: List[int],
    nlp: spacy.Language,
    batch_size: int = 256
) -> List[Dict]:
    """
    Función orquestadora que une textos con sus IDs y extrae fragmentos
    listos para enviar al modelo BERT de sentimiento.
    
    Args:
        textos: Lista de reseñas en español.
        ids: Lista de identificadores de reseñas.
        nlp: Modelo SpaCy cargado.
        batch_size: Tamaño de lote para procesamiento.
    
    Returns:
        Lista de diccionarios con metadata completa por aspecto.
    """
    resultados = []
    
    for review_id, doc, aspectos in zip(
        ids, 
        nlp.pipe(textos, batch_size=batch_size),
        procesar_textos_spacy(textos, nlp, batch_size)
    ):
        for aspecto in aspectos:
            resultados.append({
                "review_id": review_id,
                "aspecto": aspecto["aspecto_lematizado"],
                "adjetivo": aspecto["adjetivo"],
                "adjetivo_lematizado": aspecto["adjetivo_lematizado"],
                "fragmento": aspecto["fragmento"],
                "texto_completo": doc.text
            })
    
    return resultados
