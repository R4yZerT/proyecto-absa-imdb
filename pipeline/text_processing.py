"""
Módulo de procesamiento lingüístico con SpaCy.
Extracción optimizada de pares (Aspecto, Adjetivo) usando nlp.pipe().
Versión mejorada: captura múltiples patrones sintácticos comunes en reseñas.
"""

import logging
from typing import List, Dict, Generator, Tuple
import spacy
from spacy.tokens import Doc, Token

logger = logging.getLogger(__name__)


def cargar_modelo_spacy(modelo: str = "es_core_news_md") -> spacy.Language:
    """
    Carga el modelo de SpaCy deshabilitando componentes no necesarios
    para ahorrar memoria y acelerar el procesamiento.
    """
    logger.info(f"Cargando modelo SpaCy: {modelo}")
    nlp = spacy.load(modelo, disable=["ner", "textcat", "entity_linker"])
    return nlp


def _construir_fragmento(doc: Doc, token1: Token, token2: Token) -> str:
    """Construye el fragmento de texto entre dos tokens (inclusive), ordenados."""
    start = min(token1.i, token2.i)
    end = max(token1.i, token2.i) + 1
    return doc[start:end].text


def _add_aspecto(
    resultados: List[Dict[str, str]],
    aspectos_vistos: set,
    aspect_token: Token,
    adj_token: Token,
    fragmento: str
):
    """Añade un aspecto a la lista si no es duplicado exacto."""
    clave = (aspect_token.lemma_.lower(), adj_token.lemma_.lower())
    if clave in aspectos_vistos:
        return
    aspectos_vistos.add(clave)
    resultados.append(
        {
            "aspecto_lematizado": aspect_token.lemma_.lower(),
            "adjetivo": adj_token.text.lower(),
            "adjetivo_lematizado": adj_token.lemma_.lower(),
            "fragmento": fragmento,
        }
    )


def extraer_aspectos_adjetivos(doc: Doc) -> List[Dict[str, str]]:
    """
    Extrae pares (sustantivo aspecto, adjetivo) de un Doc de SpaCy.
    Captura múltiples patrones sintácticos comunes en reseñas cinematográficas.

    Patrones implementados:
    1. NOUN/PROPN + amod ADJ       → "película buena"
    2. ADJ ROOT + nsubj NOUN       → "la película es buena" (ROOT=buena)
    3. VERB + nsubj NOUN + acomp ADJ → "la trama me pareció confusa"
    4. NOUN + cop + attr/acomp ADJ  → "el villano es malo"
    5. NOUN + acl ADJ              → "película llena de acción"
    """
    resultados: List[Dict[str, str]] = []
    aspectos_vistos: set = set()

    for sent in doc.sents:
        # -------------------------------------------------------------------
        # Patrón 1: Sustantivo con adjetivo modificador (amod)
        # Ej: "una película buena", "el villano malo"
        # -------------------------------------------------------------------
        for token in sent:
            if token.pos_ in ("NOUN", "PROPN"):
                for child in token.children:
                    if child.dep_ == "amod" and child.pos_ == "ADJ":
                        frag = _construir_fragmento(doc, token, child)
                        _add_aspecto(resultados, aspectos_vistos, token, child, frag)

        # -------------------------------------------------------------------
        # Patrón 2: Adjetivo como ROOT con sujeto sustantivo (copula)
        # Ej: "la película es buena", "el villano parece malo"
        #     ROOT=buena, nsubj→película
        # -------------------------------------------------------------------
        for token in sent:
            if token.pos_ == "ADJ":
                for child in token.children:
                    if child.dep_ in ("nsubj", "nsubj:pass") and child.pos_ in ("NOUN", "PROPN"):
                        frag = _construir_fragmento(doc, child, token)
                        _add_aspecto(resultados, aspectos_vistos, child, token, frag)

        # -------------------------------------------------------------------
        # Patrón 3: Verbo con sujeto sustantivo y complemento adjetival
        # Ej: "la trama me pareció confusa", "la actuación resultó excelente"
        #     pareció(ROOT) → nsubj:trama, acomp:confusa
        # -------------------------------------------------------------------
        for token in sent:
            if token.pos_ in ("VERB", "AUX"):
                sujeto = None
                adjetivo = None
                for child in token.children:
                    if child.dep_ in ("nsubj", "nsubj:pass") and child.pos_ in ("NOUN", "PROPN"):
                        sujeto = child
                    elif child.pos_ == "ADJ" and child.dep_ in ("acomp", "attr", "xcomp", "ccomp", "obj", "obl"):
                        adjetivo = child
                if sujeto and adjetivo:
                    frag = _construir_fragmento(doc, sujeto, adjetivo)
                    _add_aspecto(resultados, aspectos_vistos, sujeto, adjetivo, frag)

        # -------------------------------------------------------------------
        # Patrón 4: Sustantivo con cláusula adjetival (acl)
        # Ej: "una película llena de acción", "un personaje bien construido"
        # -------------------------------------------------------------------
        for token in sent:
            if token.pos_ in ("NOUN", "PROPN"):
                for child in token.children:
                    if child.dep_ == "acl" and child.pos_ == "ADJ":
                        frag = _construir_fragmento(doc, token, child)
                        _add_aspecto(resultados, aspectos_vistos, token, child, frag)

        # -------------------------------------------------------------------
        # Patrón 5: Adjetivo predicativo con copula explícita
        # Ej: "el villano es malo" donde "es" es cop y "malo" es attr/acomp
        #     del head del sustantivo.
        # -------------------------------------------------------------------
        for token in sent:
            if token.pos_ in ("NOUN", "PROPN"):
                for child in token.children:
                    if child.dep_ == "cop" and child.pos_ in ("AUX", "VERB"):
                        # Buscar adjetivo hermano del cop (mismo padre o head del sustantivo)
                        head = token.head
                        for sibling in head.children:
                            if sibling.pos_ == "ADJ" and sibling.dep_ in ("attr", "acomp", "ROOT"):
                                frag = _construir_fragmento(doc, token, sibling)
                                _add_aspecto(resultados, aspectos_vistos, token, sibling, frag)

    return resultados


def procesar_textos_spacy(
    textos: List[str],
    nlp: spacy.Language,
    batch_size: int = 256,
    n_process: int = 1,
) -> Generator[List[Dict[str, str]], None, None]:
    """
    Procesa una lista de textos usando nlp.pipe() para máxima eficiencia.
    Genera listas de aspectos extraídos por cada texto.
    """
    logger.info(
        f"Iniciando extracción con SpaCy: {len(textos)} textos, batch={batch_size}"
    )
    total_errores = 0
    total_aspectos = 0

    for doc in nlp.pipe(textos, batch_size=batch_size, n_process=n_process):
        try:
            aspectos = extraer_aspectos_adjetivos(doc)
            total_aspectos += len(aspectos)
            yield aspectos
        except Exception as e:
            total_errores += 1
            logger.error(f"Error procesando texto: {e}")
            yield []

    logger.info(
        f"Extracción finalizada: {total_aspectos} aspectos, {total_errores} errores"
    )
