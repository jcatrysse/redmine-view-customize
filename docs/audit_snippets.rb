# Lists the stored snippets that mention markup which changed in Redmine 7.
# Usage: RAILS_ENV=production bundle exec rails runner plugins/view_customize/docs/audit_snippets.rb
CHECKS = {
  /#loggedas/ => '#loggedas is gone in Redmine 7',
  /#account|#top-menu/ => 'header and user menu changed (#account is a dropdown, #top-menu is a nav with .general-menu/.profile-menu)',
  /\bicon[ -]icon-|\.icon-|class=["'][^"']*\bicon\b/ => 'CSS icons are replaced by inline SVG (sprite_icon)',
  /gravatar/ => '.gravatar-with-child is now .avatar-with-child',
  /\.subject/ => 'the sticky issue header adds a second .subject on the issue page',
  /fieldset|legend/ => 'fieldset borders and legends were restyled',
  /#history|\.journal/ => 'journals markup changed (#history.journals)',
  /#quick-search|#header|#main-menu/ => 'header markup changed',
  /\.contextual/ => '.contextual links now carry SVG icons',
  /due_date|is_private|assigned_to|watcher/ => 'Redmine 7 may do this itself (default due date, default private, assignee groups, assignee as watcher)',
}.freeze

hits = 0
ViewCustomize.order(:id).each do |vc|
  reasons = CHECKS.select { |re, _| vc.code =~ re }.values
  next if reasons.empty?

  hits += 1
  puts "##{vc.id} [#{vc.insertion_position}/#{vc.customize_type}] path=#{vc.path_pattern.inspect} " \
       "enabled=#{vc.is_enabled} #{vc.comments}"
  reasons.each { |r| puts "    - #{r}" }
end
puts "#{hits} of #{ViewCustomize.count} snippets to check"
