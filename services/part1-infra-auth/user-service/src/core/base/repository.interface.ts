export interface Repository<TEntity> {
  findById(id: string): Promise<TEntity | null>;
  findAll(): Promise<TEntity[]>;
  create(entity: TEntity): Promise<TEntity>;
  update(id: string, entity: Partial<TEntity>): Promise<TEntity>;
  delete(id: string): Promise<void>;
}
