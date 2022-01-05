export const deleteFieldArrayIds = (list?: any[] | null) => {
  list?.forEach((el) => {
    if (el) {
      delete el.id;
    }
  });
};

export default deleteFieldArrayIds;
