import { Repository } from '../../core/base/repository.interface';
import { User } from './user.entity';

export interface UserRepository extends Repository<User> {
  findByEmail(email: string): Promise<User | null>;
}
