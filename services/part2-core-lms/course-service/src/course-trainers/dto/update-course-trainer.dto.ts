import { PartialType } from '@nestjs/mapped-types';
import { CreateCourseTrainerDto } from './create-course-trainer.dto';

export class UpdateCourseTrainerDto extends PartialType(CreateCourseTrainerDto) {}
