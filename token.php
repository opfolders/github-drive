<?php



$url = 'https://github.com/login/oauth/access_token';
/*
$data = array(
    'client_id' => '9621bb7cc85da90cd062',
    'client_secret' => '1e467f1c37619df19c90c3186706402cf3f10141',
    'code' => urlencode($_GET['code'])
);
*/

$data = array(
    'client_id' => urlencode($_GET['client_id']),
    'client_secret' => urlencode($_GET['client_secret']),
    'code' => urlencode($_GET['code'])
);


// use key 'http' even if you send the request to https://...
$options = array(
    'http' => array(
        'header'  => "Content-type: application/x-www-form-urlencoded\r\n",
        'method'  => 'POST',
        'content' => http_build_query($data),
    ),
);
$context  = stream_context_create($options);
$result = file_get_contents($url, false, $context);

preg_match('/access_token=([0-9a-f]+)/', $result, $out);
if (sizeof($out) < 1) {    
    echo "Error: ";
    print_r($response);
} else {
    echo $out[1];
}



/*
$ch = curl_init('https://github.com/login/oauth/access_token');
curl_setopt($ch, CURLOPT_POSTFIELDS, $data);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$response = curl_exec($ch);

preg_match('/access_token=([0-9a-f]+)/', $response, $out);
if (sizeof($out) < 1) {
    
    echo "Error: ";
    print_r($response);
} else {
    echo $out[1];
}

curl_close($ch);
*/
?>
