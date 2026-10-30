create function touch_updated() returns trigger language plpgsql as $$ begin new.updated_at=now(); return new; end $$;
create table surveys (
 id uuid primary key default gen_random_uuid(), code text unique not null, name text not null,
 closed_on date not null, owner text not null, purpose text not null, notice_ref text not null default '',
 access_review_on date, retention_review_on date, minimum_responses integer not null default 5 check(minimum_responses>=5),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table questions (
 id uuid primary key default gen_random_uuid(), code text unique not null, name text not null, factor text not null,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table results (
 id uuid primary key default gen_random_uuid(), survey_id uuid not null references surveys(id), question_id uuid not null references questions(id),
 responses integer check(responses>=0), favorable_pct numeric(5,2) check(favorable_pct between 0 and 100),
 state text not null check(state in ('released','suppressed','unknown')), source_ref text not null,
 source_hash text not null, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(survey_id,question_id), check((state='released' and responses is not null and favorable_pct is not null) or (state<>'released' and responses is null and favorable_pct is null))
);
create table actions (
 id uuid primary key default gen_random_uuid(), code text unique not null, name text not null, result_id uuid not null references results(id),
 owner text not null, due_on date not null, review_on date not null, target_pct numeric(5,2) not null check(target_pct between 0 and 100),
 completed_on date, status text not null default 'open' check(status in ('open','active','done')), completion_ref text not null default '',
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check(review_on>=due_on), check((status='done' and completed_on is not null and length(trim(completion_ref))>0) or (status<>'done' and completed_on is null))
);
create table checkins (
 id uuid primary key default gen_random_uuid(), action_id uuid not null references actions(id), note text not null,
 progress text not null check(progress in ('on-track','blocked','completed')), evidence_ref text not null,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table notes (
 id uuid primary key default gen_random_uuid(), survey_id uuid not null references surveys(id), note text not null,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table activity (
 id uuid primary key default gen_random_uuid(), entity text not null, record_id uuid not null, actor text not null,
 operation text not null, before_value jsonb, after_value jsonb,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create function audit_change() returns trigger language plpgsql as $$
declare who text;
begin
 who=current_setting('app.actor',true);
 if who is null or trim(who)='' then raise exception 'An actor is required'; end if;
 insert into activity(entity,record_id,actor,operation,before_value,after_value)
 values(TG_TABLE_NAME,new.id,who,TG_OP,case when TG_OP='UPDATE' then to_jsonb(old) else null end,to_jsonb(new));
 return new;
end $$;
create function result_guard() returns trigger language plpgsql as $$
declare minimum integer;
begin
 select minimum_responses into minimum from surveys where id=new.survey_id;
 if new.state='released' and new.responses<minimum then raise exception 'Result is below reporting minimum'; end if;
 return new;
end $$;
create trigger result_guard before insert or update on results for each row execute function result_guard();
alter table surveys enable row level security; revoke all on surveys from public;
create trigger touch_updated before update on surveys for each row execute function touch_updated();
create trigger audit_change after insert or update on surveys for each row execute function audit_change();
alter table questions enable row level security; revoke all on questions from public;
create trigger touch_updated before update on questions for each row execute function touch_updated();
create trigger audit_change after insert or update on questions for each row execute function audit_change();
alter table results enable row level security; revoke all on results from public;
create trigger touch_updated before update on results for each row execute function touch_updated();
create trigger audit_change after insert or update on results for each row execute function audit_change();
alter table actions enable row level security; revoke all on actions from public;
create trigger touch_updated before update on actions for each row execute function touch_updated();
create trigger audit_change after insert or update on actions for each row execute function audit_change();
alter table checkins enable row level security; revoke all on checkins from public;
create trigger touch_updated before update on checkins for each row execute function touch_updated();
create trigger audit_change after insert or update on checkins for each row execute function audit_change();
alter table notes enable row level security; revoke all on notes from public;
create trigger touch_updated before update on notes for each row execute function touch_updated();
create trigger audit_change after insert or update on notes for each row execute function audit_change();
alter table activity enable row level security; revoke all on activity from public;
create trigger touch_updated before update on activity for each row execute function touch_updated();

create view scorecard as
select r.id,r.survey_id,r.question_id,s.code survey,s.name survey_name,s.closed_on,q.code question,q.name question_text,q.factor,
 r.responses,r.favorable_pct,r.state,r.source_ref from results r join surveys s on s.id=r.survey_id join questions q on q.id=r.question_id;
create view score_changes as
select *, case when state='released' and previous_state='released' then favorable_pct-previous_pct end change_points from (
 select c.*,lag(favorable_pct) over(partition by question_id order by closed_on,survey) previous_pct,
 lag(state) over(partition by question_id order by closed_on,survey) previous_state,
 lag(survey) over(partition by question_id order by closed_on,survey) previous_survey from scorecard c
) x;
create view action_queue as
select a.id,a.code,a.name,a.owner,a.status,a.due_on,a.review_on,c.survey,c.question,c.favorable_pct baseline_pct,a.target_pct,
 case when a.status<>'done' and a.due_on<current_date then 'overdue' when a.status='done' and a.review_on<=current_date then 'review due' else 'scheduled' end attention,
 (select max(created_at) from checkins where action_id=a.id) last_checkin,
 (select progress from checkins where action_id=a.id order by created_at desc,id desc limit 1) latest_progress
from actions a join scorecard c on c.id=a.result_id;
create view priorities as
select c.*, (select count(*)::integer from actions a where a.result_id=c.id and a.status<>'done') open_actions
from scorecard c where c.state='released' and c.favorable_pct<70;
create view outcome_review as
select a.id,a.code,a.name,a.owner,a.status,a.review_on,a.target_pct,c.survey baseline_survey,c.question,c.favorable_pct baseline_pct,
 next.survey followup_survey,next.closed_on followup_date,next.favorable_pct followup_pct,
 case when next.state='released' then next.favorable_pct-c.favorable_pct end change_points,
 case when next.id is null then 'no follow-up' when next.state<>'released' then 'follow-up withheld' when next.favorable_pct>=a.target_pct then 'target met' else 'below target' end outcome
from actions a join scorecard c on c.id=a.result_id
left join lateral (select f.* from scorecard f where f.question_id=c.question_id and f.closed_on>c.closed_on and f.closed_on>=a.completed_on order by f.closed_on desc,f.survey limit 1) next on true
where a.status='done';
create view compliance_checks as
select code record,'purpose-notice' rule,'Survey notice evidence missing' issue,'https://www.privacy.org.nz/privacy-principles/3/' source from surveys where trim(notice_ref)=''
union all select code,'access-review','Access review missing or overdue','https://www.privacy.org.nz/privacy-principles/5/' from surveys where access_review_on is null or access_review_on<current_date
union all select code,'retention-review','Retention purpose review missing or overdue','https://www.privacy.org.nz/privacy-principles/9/' from surveys where retention_review_on is null or retention_review_on<current_date
union all select s.code||':'||q.code,'suppression','Score withheld or response count unknown','https://support.cultureamp.com/en/articles/8384294-general-survey-participant-faqs' from results r join surveys s on s.id=r.survey_id join questions q on q.id=r.question_id where r.state<>'released';
revoke all on scorecard,score_changes,action_queue,priorities,outcome_review,compliance_checks from public;
