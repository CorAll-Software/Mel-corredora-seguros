import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { normalizarPlaca } from '../src/core/comparador/vehiculo';
import { SinConsultaVehicular } from '../src/server/comparador/vehicle-lookup';

// Consulta vehicular por placa (issue #50): dominio y la implementación actual.

describe('placa del vehículo', () => {
  it('normaliza las placas peruanas y rechaza lo que no lo es', () => {
    assert.equal(normalizarPlaca('abc-123'), 'ABC123');
    assert.equal(normalizarPlaca(' A1B 234 '), 'A1B234');
    assert.equal(normalizarPlaca('ABCDEF'), null);
    assert.equal(normalizarPlaca('AB-12'), null);
    assert.equal(normalizarPlaca('ABC-1234'), null);
  });

  it('sin vía oficial, la consulta no devuelve datos y el comparador sigue a mano', async () => {
    assert.equal(await new SinConsultaVehicular().buscar('ABC123'), null);
  });
});
