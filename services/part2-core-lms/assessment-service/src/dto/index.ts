import { IsString, IsNotEmpty, IsOptional, IsUUID, IsEnum, IsInt, Min, Max, IsNumber, IsArray, ValidateNested, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateOptionDto {
  @IsInt()
  id: number;

  @IsString() @IsNotEmpty()
  text: string;

  @IsBoolean()
  isCorrect: boolean;
}

export class CreateQuestionDto {
  @IsUUID() @IsNotEmpty()
  course_id: string;

  @IsEnum(['MCQ', 'ESSAY', 'CODING'])
  type: string;

  @IsString() @IsNotEmpty()
  title: string;

  @IsString() @IsNotEmpty()
  content: string;

  @IsInt() @Min(1)
  marks: number;

  @IsArray() @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CreateOptionDto)
  options?: CreateOptionDto[];
}

export class CreateQuizDto {
  @IsString() @IsNotEmpty()
  title: string;

  @IsUUID() @IsNotEmpty()
  course_id: string;

  @IsInt() @Min(1)
  duration_mins: number;

  @IsArray() @IsUUID(undefined, { each: true })
  question_ids: string[];
}

export class SubmitQuizDto {
  answers: Record<string, number | string>;
}

export class CreateAssignmentDto {
  @IsString() @IsNotEmpty()
  title: string;

  @IsString() @IsNotEmpty()
  description: string;

  @IsUUID() @IsNotEmpty()
  course_id: string;

  @IsInt() @Min(1)
  max_marks: number;
}

export class SubmitAssignmentDto {
  @IsString() @IsOptional()
  text_content?: string;

  @IsString() @IsOptional()
  file_url?: string;
}

export class GradeSubmissionDto {
  @IsNumber() @Min(0)
  score: number;

  @IsString() @IsOptional()
  feedback?: string;
}
