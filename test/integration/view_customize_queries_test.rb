require File.expand_path('../../test_helper', __FILE__)

class ViewCustomizeQueriesTest < Redmine::IntegrationTest
  fixtures :projects, :users, :email_addresses, :user_preferences, :roles, :members, :member_roles,
           :trackers, :projects_trackers, :enabled_modules, :issue_statuses, :issues, :enumerations,
           :custom_fields, :custom_values, :custom_fields_projects, :custom_fields_trackers,
           :workflows, :journals, :journal_details, :view_customizes

  def count_customize_queries
    count = 0
    subscriber = ActiveSupport::Notifications.subscribe('sql.active_record') do |*, payload|
      count += 1 if payload[:sql] =~ /FROM\s+["`]?view_customizes["`]?/i
    end
    yield
    count
  ensure
    ActiveSupport::Notifications.unsubscribe(subscriber)
  end

  def test_customizations_are_loaded_once_per_request_whatever_the_insertion_points
    log_user('jsmith', 'jsmith')
    positions = [ViewCustomize::INSERTION_POSITION_ISSUE_FORM, ViewCustomize::INSERTION_POSITION_ISSUE_SHOW,
                 ViewCustomize::INSERTION_POSITION_HTML_BOTTOM, ViewCustomize::INSERTION_POSITION_HTML_HEAD]
    positions.each_with_index do |position, i|
      ViewCustomize.create!(:code => "marker#{i}", :customize_type => ViewCustomize::TYPE_HTML,
                            :insertion_position => position, :path_pattern => '', :project_pattern => '', :comments => '')
    end

    queries = count_customize_queries { get '/issues/1' }
    assert_response :success
    # every position was rendered...
    positions.each_index {|i| assert_includes response.body, "marker#{i}" }
    # ...from a single query
    assert_equal 1, queries
  end
end
