export interface CustomTransfomer<I, O> {
  isApplicable: (v: any) => v is I;
  serialize: (v: I) => O;
  deserialize: (v: O) => I;
}
