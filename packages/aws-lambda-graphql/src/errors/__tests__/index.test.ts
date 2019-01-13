import { ExtendableError } from '../';

describe('ExtendableError', () => {
  it('works correctly', () => {
    const error = new ExtendableError();

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(ExtendableError);
    expect(new Error()).not.toBeInstanceOf(ExtendableError);
  });

  it('can be extended', () => {
    class ExtendedExtendableError extends ExtendableError {}

    const error = new ExtendedExtendableError();

    expect(error).toBeInstanceOf(ExtendedExtendableError);
    expect(error).toBeInstanceOf(ExtendableError);
    expect(error).toBeInstanceOf(Error);
    expect(new Error()).not.toBeInstanceOf(ExtendedExtendableError);
    expect(new ExtendableError()).not.toBeInstanceOf(ExtendedExtendableError);
  });
});
