import { IsString, IsNotEmpty, IsOptional, IsUUID, IsEnum, IsInt, Min, IsArray } from 'class-validator';

export class CreateCourseDto {
  @IsString() @IsNotEmpty()
  title: string;

  @IsString() @IsOptional()
  description?: string;
}

export class UpdateCourseDto {
  @IsString() @IsOptional()
  title?: string;

  @IsString() @IsOptional()
  description?: string;

  @IsEnum(['DRAFT', 'IN_REVIEW', 'PUBLISHED', 'ARCHIVED']) @IsOptional()
  status?: string;
}

export class CreateModuleDto {
  @IsString() @IsNotEmpty()
  title: string;

  @IsUUID() @IsNotEmpty()
  course_id: string;

  @IsInt() @Min(1) @IsOptional()
  sequence_no?: number;
}

export class ReorderModulesDto {
  @IsArray()
  @IsUUID(undefined, { each: true })
  module_ids: string[];  // ordered array of module IDs
}

export class CreateLessonDto {
  @IsString() @IsNotEmpty()
  title: string;

  @IsUUID() @IsNotEmpty()
  module_id: string;

  @IsInt() @Min(1) @IsOptional()
  sequence_no?: number;
}

export class CreateTopicDto {
  @IsString() @IsNotEmpty()
  title: string;

  @IsUUID() @IsNotEmpty()
  lesson_id: string;

  @IsString() @IsOptional()
  content?: string;

  @IsInt() @Min(1) @IsOptional()
  sequence_no?: number;
}

export class EnrollDto {
  @IsUUID() @IsNotEmpty()
  user_id: string;

  @IsUUID() @IsNotEmpty()
  course_id: string;
}

export class UpdateProgressDto {
  @IsEnum(['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED'])
  status: string;
}
