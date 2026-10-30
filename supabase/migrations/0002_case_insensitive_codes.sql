create unique index surveys_code_ci on surveys(lower(code));
create unique index questions_code_ci on questions(lower(code));
create unique index actions_code_ci on actions(lower(code));
