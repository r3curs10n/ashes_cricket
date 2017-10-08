$(document).ready(function(){
  $('.profile-link').on('click', function(){
    var fbid = $(this).attr('data-fbid');
    $.ajax({
      url: '/user/' + fbid,
      type: 'GET',
      dataType: 'JSON',
      success: function(data){
        console.log(data);
        $('#profileName').text(data.fb_name);
        $('#profileMatches').text(data.stats.matches);
        $('#profileRuns').text(data.stats.runs);
        $('#profileAverage').text(Number(parseFloat(data.stats.average).toFixed(2)));
        $('#profileStrikeRate').text(Math.floor(parseFloat(data.stats.strike_rate)*100));
        $('#profileImage').attr('src', 'http://graph.facebook.com/'+fbid+'/picture?type=square');
      }
    });
  });
});
