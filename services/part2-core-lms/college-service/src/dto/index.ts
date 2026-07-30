import { IsString, IsNotEmpty, IsOptional, IsUUID, IsEmail, MinLength } from 'class-validator';

export class CreateCollegeDto {
  @IsString() @IsNotEmpty()
  name: string;

  @IsString() @IsNotEmpty()
  subdomain: string;
}

export class UpdateCollegeDto {
  @IsString() @IsOptional()
  name?: string;

  @IsString() @IsOptional()
  subdomain?: string;
}

export class CreateDepartmentDto {
  @IsString() @IsNotEmpty()
  name: string;

  @IsUUID() @IsNotEmpty()
  college_id: string;
}

export class CreateBranchDto {
  @IsString() @IsNotEmpty()
  name: string;

  @IsUUID() @IsNotEmpty()
  department_id: string;
}

export class CreateSemesterDto {
  @IsString() @IsNotEmpty()
  name: string;

  @IsUUID() @IsNotEmpty()
  branch_id: string;
}

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString() @MinLength(6)
  password: string;

  @IsString() @IsNotEmpty()
  first_name: string;

  @IsString() @IsNotEmpty()
  last_name: string;
}
