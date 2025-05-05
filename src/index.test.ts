describe('Sample Test', () => {
  it('should pass the basic test', () => {
    expect(true).toBe(true);
  });
});

describe('Index Module', () => {
  let indexModule: any;

  beforeAll(() => {
    indexModule = require('./index');
  });

  it('should be defined', () => {
    expect(indexModule).toBeDefined();
  });

  it('should export an object or a function', () => {
    const type = typeof indexModule;
    expect(type === 'object' || type === 'function').toBeTruthy();
  });
});
