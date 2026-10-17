// Superfície de dados da feature: o serviço HTTP mora no core (config da base
// + cliente, ADR 0010) e é re-exportado aqui para o store e as telas
// dependerem só de `features/price-history/data`.
export { PriceHistoryApiService } from '../../../core/price-history';
