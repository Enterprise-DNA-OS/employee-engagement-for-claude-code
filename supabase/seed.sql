select set_config('app.actor','Fictional demo seed',true);
insert into surveys(code,name,closed_on,owner,purpose,notice_ref,access_review_on,retention_review_on) values
('S01','Winter listening review',current_date-100,'Avery Chen','Improve workload and manager follow-through','demo:notice-v1',current_date+30,current_date+180),
('S02','Spring listening review',current_date-14,'Morgan Patel','Check workload and manager follow-through','demo:notice-v1',current_date-2,current_date+180),
('S03','Service listening review',current_date-7,'Avery Chen','Review service-team practices','',null,current_date-1)
on conflict(code) do nothing;
insert into questions(code,name,factor) values
('Q01','My workload is manageable','Workload'),('Q02','My manager follows through on agreed actions','Management'),
('Q03','I have the tools to do my work','Enablement'),('Q04','I can raise a concern safely','Voice') on conflict(code) do nothing;
insert into results(survey_id,question_id,responses,favorable_pct,state,source_ref,source_hash)
select s.id,q.id,x.n,x.p,x.state,'demo:approved-overall-report',s.code||q.code from (values
('S01','Q01',30,48.00,'released'),('S01','Q02',30,55.00,'released'),('S01','Q03',28,76.00,'released'),('S01','Q04',null,null,'suppressed'),
('S02','Q01',32,61.00,'released'),('S02','Q02',31,72.00,'released'),('S02','Q03',30,70.00,'released'),('S02','Q04',null,null,'suppressed'),
('S03','Q01',null,null,'unknown'),('S03','Q03',12,58.00,'released')) x(s,q,n,p,state)
join surveys s on s.code=x.s join questions q on q.code=x.q on conflict(survey_id,question_id) do nothing;
insert into actions(code,name,result_id,owner,due_on,review_on,target_pct,status,completion_ref,completed_on)
select x.code,x.name,r.id,x.owner,current_date+x.due,current_date+x.review,x.target,x.status,x.proof,case when x.status='done' then current_date+x.due else null end from (values
('A01','Set a weekly workload check','S01','Q01','Avery Chen',-40,-10,65,'done','demo:workload-check-in-use'),
('A02','Introduce a manager commitment review','S01','Q02','Morgan Patel',-35,-8,70,'done','demo:manager-review-minutes'),
('A03','Remove duplicate service handovers','S02','Q01','Avery Chen',-3,25,70,'active',''),
('A04','Replace the service knowledge checklist','S03','Q03','Casey Williams',8,40,75,'open','')) x(code,name,s,q,owner,due,review,target,status,proof)
join surveys s on s.code=x.s join questions q on q.code=x.q join results r on r.survey_id=s.id and r.question_id=q.id on conflict(code) do nothing;
insert into checkins(action_id,note,progress,evidence_ref,created_at)
select a.id,'Waiting for an agreed handover owner','blocked','demo:ops-review',now()-interval '18 days' from actions a where code='A03' and not exists(select 1 from checkins where action_id=a.id);
