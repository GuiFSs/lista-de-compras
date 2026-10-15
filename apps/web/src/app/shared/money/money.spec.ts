import {
  digitsFromInput,
  digitsFromNumber,
  formatBrlFromDigits,
  formatDecimal,
  numberFromDigits,
  parseDecimal,
} from './money';

describe('digitsFromInput', () => {
  it('mantém apenas os dígitos', () => {
    expect(digitsFromInput('3015')).toBe('3015');
  });

  it('descarta prefixo, separadores, sinal e letras — inclusive ao colar', () => {
    expect(digitsFromInput('R$ 1.234,56')).toBe('123456');
    expect(digitsFromInput('abc12,34')).toBe('1234');
    expect(digitsFromInput('-1')).toBe('1');
  });

  it('sem dígitos, retorna vazio', () => {
    expect(digitsFromInput('R$ ')).toBe('');
    expect(digitsFromInput('')).toBe('');
  });
});

describe('formatBrlFromDigits', () => {
  it('formata os dígitos como centavos, entrando pela direita', () => {
    expect(formatBrlFromDigits('')).toBe('');
    expect(formatBrlFromDigits('3')).toBe('R$ 0,03');
    expect(formatBrlFromDigits('30')).toBe('R$ 0,30');
    expect(formatBrlFromDigits('3015')).toBe('R$ 30,15');
  });

  it('acima de mil não usa separador de milhar (CD-15)', () => {
    expect(formatBrlFromDigits('123456')).toBe('R$ 1234,56');
  });

  it('não há limite artificial de dígitos (CD-15)', () => {
    expect(formatBrlFromDigits('123456789')).toBe('R$ 1234567,89');
  });

  it('o dígito zero é valor, não ausência', () => {
    expect(formatBrlFromDigits('0')).toBe('R$ 0,00');
  });
});

describe('numberFromDigits', () => {
  it('sem dígitos é ausência, não zero', () => {
    expect(numberFromDigits('')).toBeNull();
  });

  it('converte centavos no número do payload', () => {
    expect(numberFromDigits('3')).toBe(0.03);
    expect(numberFromDigits('3015')).toBe(30.15);
    expect(numberFromDigits('1000')).toBe(10);
  });

  it('não há limite artificial de dígitos no payload (CD-15)', () => {
    expect(numberFromDigits('123456789')).toBe(1234567.89);
  });
});

describe('digitsFromNumber', () => {
  it('faz o prefill sem erro de ponto flutuante', () => {
    expect(digitsFromNumber(12.5)).toBe('1250');
    expect(digitsFromNumber(9.9)).toBe('990');
    expect(digitsFromNumber(30.15)).toBe('3015');
  });

  it('fecha o ciclo prefill → exibição', () => {
    expect(formatBrlFromDigits(digitsFromNumber(12.5))).toBe('R$ 12,50');
    expect(formatBrlFromDigits(digitsFromNumber(9.9))).toBe('R$ 9,90');
  });
});

describe('parseDecimal (quantidade)', () => {
  it('aceita vírgula ou ponto e ignora espaços nas bordas', () => {
    expect(parseDecimal('2,5')).toBe(2.5);
    expect(parseDecimal('2.5')).toBe(2.5);
    expect(parseDecimal(' 3 ')).toBe(3);
  });

  it('campo vazio é ausência', () => {
    expect(parseDecimal('')).toBeNull();
    expect(parseDecimal('   ')).toBeNull();
  });

  it('texto não numérico vira NaN, que bloqueia o envio', () => {
    expect(Number.isNaN(parseDecimal('abc'))).toBe(true);
  });
});

describe('formatDecimal (quantidade)', () => {
  it('exibe com vírgula', () => {
    expect(formatDecimal(2.5)).toBe('2,5');
    expect(formatDecimal(3)).toBe('3');
  });
});
