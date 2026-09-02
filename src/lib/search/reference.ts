import type { Book } from "@/lib/types";

/**
 * Formata uma referência bíblica normalizada a partir de um livro,
 * capítulo e (opcionalmente) intervalo de versículos.
 *
 * Exemplos:
 *   formatReference(joao, 3) -> "João 3"
 *   formatReference(joao, 3, 16) -> "João 3:16"
 *   formatReference(lucas, 22, 47, 52) -> "Lucas 22:47-52"
 */
export function formatReference(
  book: Pick<Book, "nome">,
  capitulo: number,
  versiculoInicio?: number,
  versiculoFim?: number,
): string {
  let referencia = `${book.nome} ${capitulo}`;
  if (versiculoInicio != null) {
    referencia += `:${versiculoInicio}`;
    if (versiculoFim != null && versiculoFim !== versiculoInicio) {
      referencia += `-${versiculoFim}`;
    }
  }
  return referencia;
}
